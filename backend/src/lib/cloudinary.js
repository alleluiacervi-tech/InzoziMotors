const cloudinary = require('cloudinary').v2;

const isConfigured = Boolean(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);

if (isConfigured) {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloudinary_url: process.env.CLOUDINARY_URL,
    });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
}

/**
 * Uploads a local file to Cloudinary.
 * @param {string} filePath - Local absolute or relative path of the file.
 * @param {string} folder - Folder name in Cloudinary (e.g. 'cars', 'rentals').
 * @returns {Promise<string|null>} - Returns the secure CDN URL or null if not configured.
 */
async function uploadToCloudinary(filePath, folder = 'general') {
  if (!isConfigured) return null;
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `sawa/${folder}`,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
    });
    return result.secure_url;
  } catch (err) {
    console.error('[Cloudinary] Upload error:', err.message);
    return null;
  }
}

module.exports = {
  cloudinary,
  isConfigured,
  uploadToCloudinary,
};
