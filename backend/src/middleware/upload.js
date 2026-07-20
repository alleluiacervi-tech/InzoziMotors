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

const imageFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only image files are allowed'));
};

// Public URL for an uploaded file — one implementation for every route.
// Uses the resolved subdir (not string surgery on the OS path) so it works on Windows too.
exports.publicUploadUrl = (req, file) => {
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}/uploads/${resolveSubdir(req)}/${file.filename}`;
};

exports.uploadPhotos = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });
exports.uploadIdDocs  = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 5  * 1024 * 1024 } });
