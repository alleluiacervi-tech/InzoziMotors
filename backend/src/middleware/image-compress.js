// ─────────────────────────────────────────────────────────────────────────────
// Make an uploaded photograph the size a photograph needs to be.
//
// Nothing used to touch an upload. multer wrote the bytes it received straight
// to disk — up to 10 MB per file, forty files per request — and that is what
// got stored, served and backed up forever. A dealer photographing twenty cars
// on a modern phone was pushing a couple of hundred megabytes up a Kigali
// mobile connection and we were keeping every byte of it.
//
// ── The settings, and why these ──────────────────────────────────────────────
// Measured on a real 4000x3000 listing photograph, 4.95 MB:
//
//   1920px q78 mozjpeg   417 KB   8.2% of the original   36.5 dB PSNR   ~450 ms
//   1920px q82 mozjpeg   472 KB   9.3%                   37.4 dB
//   2048px q82 mozjpeg   520 KB  10.3%                   38.2 dB
//   1920px AVIF q60      291 KB   5.7%                   36.6 dB      ~13800 ms
//
// Above roughly 36 dB the difference is not visible on a phone, so 1920/q78 is
// the knee of the curve: a twelvefold reduction that a buyer cannot see.
//
// AVIF is genuinely smaller and thirty times slower to encode. At fourteen
// seconds a photograph it would hold a core for ten minutes on a forty-photo
// listing; on a four-core VPS that is not a trade worth making. WebP is offered
// on the way OUT instead, by the variant middleware, where the work is cached.
//
// ── EXIF ─────────────────────────────────────────────────────────────────────
// `.rotate()` with no argument applies the EXIF orientation tag and then the
// pixels are upright for real. It has to happen BEFORE the resize, or a
// portrait photograph is measured on its side. sharp drops metadata unless
// asked to keep it, so the GPS coordinates a phone writes into a photograph —
// which on a seller's driveway is their home address — do not survive this.
// That is a deliberate outcome, not a side effect.
//
// ── Failure ──────────────────────────────────────────────────────────────────
// A photograph that cannot be compressed is stored as it arrived. This
// middleware can make an upload cheaper; it must never make one fail.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { log } = require('../lib/log');

const MAX_EDGE = 1920;
const JPEG_QUALITY = 78;
const WEBP_QUALITY = 82;

// Below this, a photograph is already small enough that re-encoding costs
// quality and saves nothing worth having. A 1600x1200 photo at 300 KB is fine.
const LEAVE_ALONE_BYTES = 600 * 1024;

// sharp is loaded lazily and never at require time — same discipline as the
// plate badge and the variant resizer. A native module that fails to load must
// degrade to storing the original, not take the API down at boot.
let sharpModule;
function loadSharp() {
  if (sharpModule === undefined) {
    try { sharpModule = require('sharp'); }
    catch (error) {
      sharpModule = null;
      log.warn('sharp unavailable; uploads are stored at their original size', { error: error.message });
    }
  }
  return sharpModule;
}

const filesOf = (req) => {
  if (req.files) return Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
  return req.file ? [req.file] : [];
};

/**
 * Rewrite one file on disk, in place, at a sane size. Returns true if it did.
 * Mutates `file.path`, `file.filename` and `file.size` when the container
 * changes, because publicUploadUrl() builds the served URL from the filename
 * and resolveUploadUrl() reads the path.
 */
async function compressOne(sharp, file) {
  const stat = await fsp.stat(file.path);
  const image = sharp(file.path, { failOn: 'none' });
  const meta = await image.metadata();

  const longEdge = Math.max(meta.width || 0, meta.height || 0);
  const oversized = longEdge > MAX_EDGE;
  const heavy = stat.size > LEAVE_ALONE_BYTES;
  if (!oversized && !heavy) return false;

  // A PNG photograph stays enormous however hard it is squeezed — PNG is
  // lossless, and a camera frame has no flat colour to exploit. Anything that
  // is not already a lossy photo format becomes a JPEG, which means the file
  // gets a new extension and therefore a new name.
  const source = (meta.format || '').toLowerCase();
  const target = source === 'webp' ? 'webp' : 'jpeg';
  const extension = target === 'webp' ? '.webp' : '.jpg';

  let pipeline = sharp(file.path, { failOn: 'none' })
    .rotate()                                             // EXIF orientation, before the resize
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true });

  pipeline = target === 'webp'
    ? pipeline.webp({ quality: WEBP_QUALITY, effort: 4 })
    : pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true, progressive: true });

  const buffer = await pipeline.toBuffer();

  // Never store a "compressed" file that is larger than what arrived. Small
  // already-optimised images can come out bigger, and the honest answer there
  // is to keep what we were given.
  if (buffer.length >= stat.size && !oversized) return false;

  const currentExtension = path.extname(file.path).toLowerCase();
  const destination = currentExtension === extension
    ? file.path
    : file.path.slice(0, -currentExtension.length || undefined) + extension;

  // Written beside the original and renamed into place, so a crash midway
  // cannot leave a half-written photograph where a whole one used to be.
  const temporary = `${destination}.${process.pid}.tmp`;
  await fsp.writeFile(temporary, buffer);
  await fsp.rename(temporary, destination);
  if (destination !== file.path) await fsp.unlink(file.path).catch(() => {});

  file.path = destination;
  file.filename = path.basename(destination);
  file.size = buffer.length;
  file.mimetype = target === 'webp' ? 'image/webp' : 'image/jpeg';
  return true;
}

/**
 * Express middleware. Mount AFTER multer and AFTER verifyImageContent — the
 * bytes must be confirmed to be an image before sharp is pointed at them.
 */
async function compressUploads(req, res, next) {
  const sharp = loadSharp();
  const files = filesOf(req);
  if (!sharp || !files.length) return next();

  // Sequential, not concurrent. Forty photographs decoded at once on a
  // four-core VPS is how an upload becomes an outage; sharp already uses a
  // thread pool per image.
  for (const file of files) {
    if (!file?.path) continue;
    const before = file.size;
    try {
      if (await compressOne(sharp, file)) {
        log.info('photo compressed on upload', {
          from: before, to: file.size,
          saved: `${Math.round((1 - file.size / before) * 100)}%`,
        });
      }
    } catch (error) {
      log.warn('could not compress an upload; storing it as received', {
        file: file.filename, error: error.message,
      });
    }
  }
  return next();
}

module.exports = { compressUploads, MAX_EDGE, JPEG_QUALITY, LEAVE_ALONE_BYTES };
