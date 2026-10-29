// backend/scripts/testCloudinary.js
// Checks that the Cloudinary keys in .env are correct.
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

cloudinary.api
  .ping()
  .then(() => console.log('Cloudinary connected:', process.env.CLOUDINARY_CLOUD_NAME))
  .catch((err) => console.error('Cloudinary failed:', err.error?.message || err.message));