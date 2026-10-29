// backend/utils/token.js
// Owner: Aarian
require('dotenv').config();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

if (!JWT_SECRET) {
  console.error('JWT_SECRET is missing in backend/.env');
  process.exit(1);
}

const signToken = (user) =>
  jwt.sign({ user_id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const verifyJwt = (token) => jwt.verify(token, JWT_SECRET);

// 6-digit OTP, generated with a secure random source
const generateOtp = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

// Random reset token for the email link; only its SHA-256 hash is stored
const generateResetToken = () => crypto.randomBytes(32).toString('hex');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

module.exports = { signToken, verifyJwt, generateOtp, generateResetToken, sha256 };
