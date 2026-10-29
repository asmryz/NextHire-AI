// backend/utils/cloudinary.js
// Owner: Shivani
// Uploads profile pictures to Cloudinary (free plan). Pictures are resized to
// 400x400 on upload so they stay small and use very little of the free quota.
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// buffer = the image bytes from multer; publicId = fixed name per user (replaces the old one)
function uploadProfilePicture(buffer, userId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'nexhire/profile-pictures',
        public_id: `user_${userId}`,
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' }],
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

function deleteImage(publicId) {
  return cloudinary.uploader.destroy(publicId, { invalidate: true });
}

module.exports = { uploadProfilePicture, deleteImage };
