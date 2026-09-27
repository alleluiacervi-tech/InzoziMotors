// ─────────────────────────────────────────────────────────────────────────────
// Remove what a photo says about where and how it was taken, without touching
// the photo itself (B4 / P2-D1 in docs/WEB-PARITY-PLAN.md).
//
// A phone writes GPS coordinates, the device model and a timestamp into every
// photograph. For an ID document taken at home, the coordinates are the
// seller's home address. compressUploads already drops metadata, but only for
// files it re-encodes, and it deliberately leaves identity documents and any
// photo under 600 KB alone.
//
// So this works on the container, not the pixels:
//   JPEG  drop APP1-APP15 and COM segments, except an ICC profile (APP2) and
//         Adobe's colour-transform marker (APP14), which change how the image
//         decodes and carry nothing about the person
//   PNG   drop eXIf, tEXt, iTXt, zTXt and tIME chunks
//   WebP  drop EXIF and XMP chunks and clear their VP8X flags
// Everything else is copied byte for byte, so an ID keeps every bit of its
// small print.
//
// The one exception is an orientation tag other than 1. Removing it would leave
// the document on its side, so that photo is rotated by sharp and re-encoded at
// quality 95.
//
// Like compressUploads, this must never make an upload fail: on any error the
// file is left as it arrived and the error is logged.
// ─────────────────────────────────────────────────────────────────────────────
const fsp = require('fs').promises;
const { log } = require('../lib/log');

let sharpModule;
function loadSharp() {
  if (sharpModule === undefined) {
    try { sharpModule = require('sharp'); }
    catch (error) {
      sharpModule = null;
      log.warn('sharp unavailable; photos with an orientation tag are stripped without being rotated', { error: error.message });
    }
  }
  return sharpModule;
}

const ICC = Buffer.from('ICC_PROFILE\0', 'latin1');
const ADOBE = Buffer.from('Adobe', 'latin1');

/** Returns the JPEG without APPn/COM metadata, or null if `buf` isn't a JPEG we can walk. */
function stripJpeg(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  const out = [buf.subarray(0, 2)];
  let i = 2;
  while (i + 1 < buf.length) {
    if (buf[i] !== 0xff) return null;
    let marker = buf[i + 1];
    // Any number of 0xFF fill bytes may precede a marker.
    while (marker === 0xff && i + 2 < buf.length) { i += 1; marker = buf[i + 1]; }

    // Start of scan: everything from here is entropy-coded image data.
    if (marker === 0xda) {
      out.push(buf.subarray(i));
      return Buffer.concat(out);
    }
    if (marker === 0xd9) {
      out.push(buf.subarray(i, i + 2));
      return Buffer.concat(out);
    }
    // Markers with no length field.
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      out.push(buf.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (i + 4 > buf.length) return null;
    const end = i + 2 + buf.readUInt16BE(i + 2);
    if (end > buf.length) return null;

    const payload = buf.subarray(i + 4, end);
    const isApp = marker >= 0xe1 && marker <= 0xef;
    const keep =
      (!isApp && marker !== 0xfe) ||
      (marker === 0xe2 && payload.subarray(0, ICC.length).equals(ICC)) ||
      (marker === 0xee && payload.subarray(0, ADOBE.length).equals(ADOBE));
    if (keep) out.push(buf.subarray(i, end));
    i = end;
  }
  return null;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_DROP = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME']);

/** Returns the PNG without text/EXIF/time chunks, or null if `buf` isn't a PNG we can walk. */
function stripPng(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  const out = [buf.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= buf.length) {
    const length = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    const end = i + 12 + length;
    if (end > buf.length) return null;
    if (!PNG_DROP.has(type)) out.push(buf.subarray(i, end));
    i = end;
    if (type === 'IEND') return Buffer.concat(out);
  }
  return null;
}

const VP8X_EXIF = 0x08;
const VP8X_XMP = 0x04;

/** Returns the WebP without EXIF/XMP chunks, or null if `buf` isn't a WebP we can walk. */
function stripWebp(buf) {
  if (buf.length < 12 || buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') {
    return null;
  }
  const chunks = [];
  let i = 12;
  while (i + 8 <= buf.length) {
    const type = buf.toString('latin1', i, i + 4);
    const size = buf.readUInt32LE(i + 4);
    // Chunks are padded to an even length; some writers omit the final pad byte.
    const end = Math.min(i + 8 + size + (size & 1), buf.length);
    if (i + 8 + size > buf.length) return null;
    if (type !== 'EXIF' && type !== 'XMP ') {
      let chunk = buf.subarray(i, end);
      if (type === 'VP8X' && size >= 1) {
        chunk = Buffer.from(chunk);
        chunk[8] &= ~(VP8X_EXIF | VP8X_XMP);
      }
      chunks.push(chunk);
    }
    i = end;
  }
  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(4 + body.length, 4);
  header.write('WEBP', 8, 'latin1');
  return Buffer.concat([header, body]);
}

/**
 * Removes metadata from one file in place. Returns what it did: 'stripped',
 * 'rotated' (re-encoded upright), or 'unchanged' (not a format it knows, or
 * nothing to remove).
 */
async function stripFile(filePath) {
  const original = await fsp.readFile(filePath);
  const sharp = loadSharp();

  if (sharp) {
    let meta = null;
    try { meta = await sharp(original).metadata(); } catch { meta = null; }
    if (meta && meta.orientation && meta.orientation !== 1) {
      const upright = sharp(original).rotate();
      let rotated;
      if (meta.format === 'png') rotated = await upright.png().toBuffer();
      else if (meta.format === 'webp') rotated = await upright.webp({ quality: 95 }).toBuffer();
      else rotated = await upright.jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toBuffer();
      await fsp.writeFile(filePath, rotated);
      return 'rotated';
    }
  }

  const stripped = stripJpeg(original) || stripPng(original) || stripWebp(original);
  if (!stripped || stripped.equals(original)) return 'unchanged';
  await fsp.writeFile(filePath, stripped);
  return 'stripped';
}

function uploadedFiles(req) {
  if (req.files) return Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
  return req.file ? [req.file] : [];
}

/** Express middleware, to run after multer and verifyImageContent. */
async function stripUploadMetadata(req, _res, next) {
  await Promise.all(uploadedFiles(req).map(async (file) => {
    try {
      await stripFile(file.path);
      const { size } = await fsp.stat(file.path);
      file.size = size;
    } catch (error) {
      log.warn('metadata strip failed; file stored as uploaded', { error: error.message });
    }
  }));
  next();
}

module.exports = { stripUploadMetadata, stripFile, stripJpeg, stripPng, stripWebp };
