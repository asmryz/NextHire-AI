// backend/routes/auth.routes.js
// Owner: Aarian
const express = require('express');
const auth = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register/send-otp', auth.sendRegisterOtp);
router.post('/register/verify', auth.verifyRegisterOtp);
router.post('/login', auth.login);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);
router.get('/me', verifyToken, auth.me);

module.exports = router;
