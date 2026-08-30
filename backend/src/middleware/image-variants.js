// ─────────────────────────────────────────────────────────────────────────────
// Listing photos at the size they are actually drawn.
//
// Every uploaded photo is stored once, at 1600×1200, averaging 460 KB. There
// was no smaller version of anything, so a phone rendering a 400-pixel card
// downloaded the full 460 KB and threw away 94% of the pixels. A twenty-car
// feed cost roughly nine megabytes of covers. On Rwandan mobile data that is
// not a performance nicety — it is the difference between browsing and not.
//
// The website escapes this because next/image re-encodes to AVIF/WebP at the
// requested width. The app has no such thing: React Native's Image fetches the
// URL it is given, whole. This middleware is the app's optimizer.
//
//   GET /uploads/cars/<id>/photo.jpg?w=400
//
// Resized with sharp, re-encoded to WebP when the client accepts it, and
// written to a disk cache so the work happens once per (file, width, format)
// rather than once per request.
//
// ── Why on demand rather than at upload ──────────────────────────────────────
// Generating derivatives during upload would help nothing already uploaded, and
// every photo on the marketplace today predates this file. Resizing on first
// request covers the whole library, old and new, with no backfill.
//
// ── Why the width allowlist ──────────────────────────────────────────────────
// An open `w` parameter is a disk-fill attack: a thousand requests for w=1..1000
// produce a thousand cached files. Only the sizes the clients actually ask for
// are honoured; anything else is served the original rather than refused,
// because a slightly-too-large photo is a better failure than a broken one.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { log } = require('../lib/log');

// The widths the clients request: a grid card, a full-width phone card, a
// retina phone card, and the gallery/zoom size.
const WIDTHS = new Set([200, 400, 800, 1200]);
const CACHE_DIR_NAME = '.variants';

// sharp is loaded lazily and never at require time. The plate badge does the
// same: a native module that fails to load must degrade to serving the
// original, not take the whole API down at boot.
let sharpModule;
function loadSharp() {
  if (sharpModule === undefined) {
    try { sharpModule = require('sharp'); }
    catch (error) {
      sharpModule = null;
      log.warn('sharp unavailable; serving original images at full size', { error: error.message });
    }
  }
  return sharpModule;
}

const RESIZABLE = /\.(jpe?g|png|webp)$/i;

/**
 * @param {string} uploadRoot absolute path the static handler serves from
 */
function imageVariants(uploadRoot) {
  const cacheRoot = path.join(uploadRoot, CACHE_DIR_NAME);

  return async function variantMiddleware(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    const width = Number.parseInt(req.query.w, 10);
    // No width asked for: fall through to the static handler, which now sets a
    // long cache lifetime of its own.
    if (!Number.isInteger(width) || !WIDTHS.has(width)) return next();

    const relative = decodeURIComponent(req.path).replace(/^\/+/, '');
    if (!RESIZABLE.test(relative)) return next();

    const source = path.resolve(uploadRoot, relative);
    // Traversal: a crafted path must not read outside the upload root, and must
    // not reach the cache directory itself.
    if (!source.startsWith(path.resolve(uploadRoot) + path.sep)) return next();
    if (source.startsWith(cacheRoot + path.sep)) return next();

    const sharp = loadSharp();
    if (!sharp) return next();

    let stat;
    try { stat = await fsp.stat(source); }
    catch { return next(); }          // missing file: let static produce the 404
    if (!stat.isFile()) return next();

    // WebP is roughly 30% smaller than JPEG at the same quality and is
    // universally supported on the Android and iOS versions this app targets.
    // The Accept header is still honoured rather than assumed.
    const wantsWebp = String(req.headers.accept || '').includes('image/webp');
    const format = wantsWebp ? 'webp' : 'jpeg';

    // The cache key includes mtime and size, so re-masking a plate — which
    // rewrites the file at the same path — cannot serve a stale derivative of
    // the photo that still showed the plate.
    const key = crypto.createHash('sha1')
      .update(`${relative}|${width}|${format}|${stat.mtimeMs}|${stat.size}`)
      .digest('hex');
    const cached = path.join(cacheRoot, `${key}.${format}`);

    try {
      await fsp.access(cached);
      return sendVariant(res, cached, format);
    } catch { /* not cached yet */ }

    try {
      const pipeline = sharp(source, { failOn: 'none' })
        // `withoutEnlargement` matters: asking for w=1200 of a 400px photo must
        // not upscale it into a blurry, larger file than the original.
        .resize({ width, withoutEnlargement: true })
        .rotate();                                  // honour EXIF orientation
      const buffer = format === 'webp'
        ? await pipeline.webp({ quality: 78 }).toBuffer()
        : await pipeline.jpeg({ quality: 80, progressive: true, mozjpeg: true }).toBuffer();

      // Never serve a derivative larger than the file it came from.
      if (buffer.length >= stat.size) return next();

      await fsp.mkdir(cacheRoot, { recursive: true });
      // Written to a temporary name and renamed, so a concurrent request can
      // never read a half-written file.
      const temp = `${cached}.${process.pid}.tmp`;
      await fsp.writeFile(temp, buffer);
      await fsp.rename(temp, cached);
      scheduleSweep(cacheRoot);
      return sendVariant(res, cached, format);
    } catch (error) {
      log.warn('image variant failed; serving the original', { relative, width, error: error.message });
      return next();
    }
  };
}

// ─── Keeping the cache bounded ────────────────────────────────────────────────
// The cache key includes the source file's mtime and size, which is what stops
// a re-masked plate serving a stale derivative — and it also means re-masking
// ORPHANS the previous set of derivatives under a key nothing will ever ask for
// again. With four widths and two formats that is up to eight files stranded
// per re-mask, and nothing ever deleted any of them. The directory could only
// grow, and the failure mode is a full disk at two in the morning.
//
// Least-recently-used, by access time, triggered by writes rather than by a
// timer: this backend has no scheduler by design (see 0009_rental_payments.sql)
// and adding one for a disk cache would be the wrong first exception.
const CACHE_LIMIT_BYTES = Number(process.env.VARIANT_CACHE_BYTES || 512 * 1024 * 1024);
// Sweeping on every write would stat the whole directory on every cache miss.
const SWEEP_EVERY_WRITES = 200;

let writesSinceSweep = 0;
let sweeping = false;

function scheduleSweep(cacheRoot) {
  if (++writesSinceSweep < SWEEP_EVERY_WRITES || sweeping) return;
  writesSinceSweep = 0;
  sweeping = true;
  // Detached: a request must never wait on housekeeping, and a failed sweep is
  // not a failed response. Errors are logged and the cache simply stays large.
  sweepCache(cacheRoot)
    .catch((error) => log.warn('variant cache sweep failed', { error: error.message }))
    .finally(() => { sweeping = false; });
}

async function sweepCache(cacheRoot) {
  let names;
  try { names = await fsp.readdir(cacheRoot); }
  catch { return; }                                   // no cache yet, nothing to do

  const entries = [];
  let total = 0;
  for (const name of names) {
    if (name.endsWith('.tmp')) continue;              // another worker is mid-write
    try {
      const stat = await fsp.stat(path.join(cacheRoot, name));
      if (!stat.isFile()) continue;
      entries.push({ name, size: stat.size, atime: stat.atimeMs });
      total += stat.size;
    } catch { /* vanished under us; that is the outcome we wanted anyway */ }
  }
  if (total <= CACHE_LIMIT_BYTES) return;

  // Oldest access first, deleting until comfortably under the limit so the next
  // sweep is not immediate. Every file here is reproducible from its source in
  // a few hundred milliseconds — this cache is an optimisation, not storage.
  entries.sort((a, b) => a.atime - b.atime);
  const target = CACHE_LIMIT_BYTES * 0.8;
  let removed = 0;
  for (const entry of entries) {
    if (total <= target) break;
    try {
      await fsp.unlink(path.join(cacheRoot, entry.name));
      total -= entry.size;
      removed++;
    } catch { /* already gone */ }
  }
  log.info('variant cache swept', { removed, remainingBytes: total });
}

function sendVariant(res, file, format) {
  res.type(format === 'webp' ? 'image/webp' : 'image/jpeg');
  // A derivative is addressed by a URL that includes its width, and the
  // underlying file never changes in place without changing its name, so this
  // is safe to cache for a year.
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  // The same URL answers differently to a client that accepts WebP, so any
  // shared cache must key on it. Without this a proxy could hand a WebP body
  // to a client that cannot read it.
  res.setHeader('Vary', 'Accept');
  return res.sendFile(file);
}

module.exports = { imageVariants, WIDTHS, CACHE_DIR_NAME, sweepCache, CACHE_LIMIT_BYTES };
