// backend/routes/candidate.routes.js
// Owner: Shivani
// Everything a logged-in candidate can do. Mounted at /api/candidate in server.js.
const express = require('express');
const multer = require('multer');
const candidate = require('../controllers/candidate.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken, requireRole('CANDIDATE'));

// Profile picture: kept in memory (not saved on the laptop), max 2 MB, images only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(null, true);
    const err = new Error('Only JPG, PNG or WEBP images are allowed.');
    err.status = 400;
    return cb(err);
  },
});

// Turns multer errors (too big / wrong type) into a clear 400 message
function pictureUpload(req, res, next) {
  upload.single('picture')(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 2 MB or smaller.' : err.message;
    return res.status(400).json({ message });
  });
}

router.get('/profile', candidate.getProfile);
router.put('/profile', candidate.updateProfile);
router.post('/profile/picture', pictureUpload, candidate.uploadPicture);
router.delete('/profile/picture', candidate.removePicture);

router.get('/vacancies', candidate.listOpenVacancies);
router.get('/vacancies/:id', candidate.getOpenVacancy);

module.exports = router;
