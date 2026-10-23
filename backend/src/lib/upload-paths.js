const fs = require('fs');
const path = require('path');

// Where an /uploads/ URL lives on disk. Shared by the plate-cover routes for
// sale photos (routes/inspections.js) and rental photos (routes/rental-plates.js).

const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

/** Turn a stored public URL into the file on disk it came from, refusing
 *  anything that tries to leave the uploads directory. Null for a URL held
 *  elsewhere (Cloudinary, external). */
function localPathForUrl(url) {
  const marker = '/uploads/';
  const at = String(url || '').indexOf(marker);
  if (at === -1) return null;
  const relative = String(url).slice(at + marker.length).split('?')[0];
  const resolved = path.resolve(UPLOAD_ROOT, relative);
  // Path traversal: a crafted stored URL must not be able to read /etc/passwd.
  if (!resolved.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)) return null;
  return resolved;
}

/** Public URL path for a file under UPLOAD_ROOT, e.g. "rental-cars/<id>/x.jpg". */
function uploadRelative(filePath) {
  return path.relative(path.resolve(UPLOAD_ROOT), filePath).split(path.sep).join('/');
}

/** Best-effort delete of a local upload by URL. Never throws. */
function removeLocalUpload(url) {
  const filePath = localPathForUrl(url);
  if (filePath) fs.unlink(filePath, () => {});
}

module.exports = { UPLOAD_ROOT, localPathForUrl, uploadRelative, removeLocalUpload };
