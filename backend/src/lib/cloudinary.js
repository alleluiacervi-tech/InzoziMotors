const cloudinary = require('cloudinary').v2;

const isConfigured = Boolean(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);

if (isConfigured) {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config(true);
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
 * @throws when Cloudinary rejects the upload or does not return a secure URL.
 */
async function uploadToCloudinary(filePath, folder = 'general') {
  if (!isConfigured) return null;
  const result = await cloudinary.uploader.upload(filePath, {
    folder: `sawa/${folder}`,
    resource_type: 'image',
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  });
  if (!result?.secure_url || !/^https:\/\//i.test(result.secure_url)) {
    throw new Error('Cloudinary did not return a secure media URL');
  }
  return result.secure_url;
}

module.exports = {
  cloudinary,
  isConfigured,
  uploadToCloudinary,
};
