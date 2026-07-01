const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sub = req.params.carId ? `cars/${req.params.carId}` : 'id-docs';
    const dir = path.join(uploadDir, sub);
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

exports.uploadPhotos = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });
exports.uploadIdDocs  = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 5  * 1024 * 1024 } });
