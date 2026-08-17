const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Subfolder resolution:
//   /inspections/cars/:carId/photos      -> cars/<carId>
//   /rentals/bookings/:bookingId/photos  -> rentals/<bookingId>
//   /id-verification (no id param)       -> id-docs (publicly 403'd, admin-gated route only)
const resolveSubdir = (req) => {
  if (req.params.carId) return `cars/${req.params.carId}`;
  if (req.params.bookingId) return `rentals/${req.params.bookingId}`;
  if (req.params.id && req.baseUrl === '/imports') return `imports/${req.params.id}`;
  return 'id-docs';
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadDir, resolveSubdir(req));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

// Extension AND declared mime must both look like an image we accept. This is
// still only what the CLIENT claims — see verifyImageMagic below for the check
// that reads the bytes on disk, which is the one that cannot be lied to.
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const imageFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return cb(new Error('Only image files are allowed'));
  }
  if (file.mimetype && !ALLOWED_MIME.includes(file.mimetype.toLowerCase())) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
};

// ─── Content verification ─────────────────────────────────────────────────────
// multer's filter runs on the filename and the client-supplied Content-Type,
// both of which the client controls completely. A .jpg that is actually a PHP
// script, an HTML document or a 10 MB zip passed straight through and was
// written to a directory served by express.static.
//
// Today the impact is limited (content type is derived from the extension, so
// the browser will not execute it), but "we store whatever anyone uploads and
// serve it back" is not a property to launch with. Reading the first bytes
// costs nothing and is the only check the uploader cannot forge.
const SIGNATURES = [
  { ext: '.jpg',  bytes: [0xff, 0xd8, 0xff] },                        // JPEG
  { ext: '.png',  bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { ext: '.webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, also: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] } },
];

function matches(buffer, sig) {
  const at = sig.offset || 0;
  for (let i = 0; i < sig.bytes.length; i++) {
    if (buffer[at + i] !== sig.bytes[i]) return false;
  }
  if (sig.also) return matches(buffer, sig.also);
  return true;
}

/** True when the file's first bytes are a JPEG, PNG or WebP header. */
function looksLikeImage(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(16);
    fs.readSync(fd, buffer, 0, 16, 0);
    return SIGNATURES.some((sig) => matches(buffer, sig));
  } catch {
    return false;
  } finally {
    if (fd !== undefined) { try { fs.closeSync(fd); } catch {} }
  }
}

/**
 * Express middleware to run AFTER multer. Deletes anything whose bytes are not
 * an image and answers 400, so nothing that failed the check is left on disk.
 * Handles both .array() and .fields() shapes.
 */
function verifyImageContent(req, res, next) {
  const files = req.files
    ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
    : (req.file ? [req.file] : []);

  const rejected = files.filter((f) => !looksLikeImage(f.path));
  if (rejected.length) {
    for (const f of files) {
      fs.unlink(f.path, () => {}); // remove the whole batch, not just the bad one
    }
    return res.status(400).json({
      error: 'That file is not a valid image. Upload a JPEG, PNG or WebP photo.',
      code: 'INVALID_IMAGE',
    });
  }
  next();
}

const IMPORT_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
const IMPORT_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']);
const importDocumentFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!IMPORT_EXT.has(ext) || !IMPORT_MIME.has(String(file.mimetype || '').toLowerCase())) {
    return cb(new Error('Import documents must be a PDF, JPEG, PNG or WebP file'));
  }
  cb(null, true);
};

function verifyImportDocument(req, res, next) {
  const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : (req.file ? [req.file] : []);
  const valid = (f) => looksLikeImage(f.path) || (() => {
    try { return fs.readFileSync(f.path, { encoding: null }).subarray(0, 5).toString() === '%PDF-'; } catch { return false; }
  })();
  if (files.some((f) => !valid(f))) {
    files.forEach((f) => fs.unlink(f.path, () => {}));
    return res.status(400).json({ error: 'The uploaded document content does not match an accepted PDF or image', code: 'INVALID_DOCUMENT' });
  }
  next();
}

const { isConfigured: hasCloudinary, uploadToCloudinary } = require('../lib/cloudinary');

// Public URL for an uploaded file — supports Cloudinary when configured, falls back to local disk.
// Uses the resolved subdir (not string surgery on the OS path) so it works on Windows too.
const publicUploadUrl = (req, file) => {
  if (file.cloudinaryUrl) return file.cloudinaryUrl;
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}/uploads/${resolveSubdir(req)}/${file.filename}`;
};

const resolveUploadUrl = async (req, file) => {
  if (file.cloudinaryUrl) return file.cloudinaryUrl;
  if (hasCloudinary && file.path) {
    try {
      const cUrl = await uploadToCloudinary(file.path, resolveSubdir(req));
      if (cUrl) {
        file.cloudinaryUrl = cUrl;
        fs.unlink(file.path, () => {});
        return cUrl;
      }
    } catch (err) {
      console.error('[Cloudinary] Upload failed, falling back to local:', err.message);
    }
  }
  return publicUploadUrl(req, file);
};

exports.publicUploadUrl = publicUploadUrl;
exports.resolveUploadUrl = resolveUploadUrl;

// files/fields caps matter as much as fileSize: without them a single request
// can open an unbounded number of parts, and the per-file limit stops being a
// per-request limit.
exports.uploadPhotos = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 40, fields: 20 },
});
exports.uploadIdDocs = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 3, fields: 10 },
});
exports.uploadImportDocs = multer({
  storage,
  fileFilter: importDocumentFilter,
  limits: { fileSize: 12 * 1024 * 1024, files: 5, fields: 20 },
});

exports.verifyImageContent = verifyImageContent;
exports.looksLikeImage = looksLikeImage;
exports.verifyImportDocument = verifyImportDocument;
