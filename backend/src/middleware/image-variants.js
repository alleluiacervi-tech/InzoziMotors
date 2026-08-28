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
      return sendVariant(res, cached, format);
    } catch (error) {
      log.warn('image variant failed; serving the original', { relative, width, error: error.message });
      return next();
    }
  };
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

module.exports = { imageVariants, WIDTHS, CACHE_DIR_NAME };
