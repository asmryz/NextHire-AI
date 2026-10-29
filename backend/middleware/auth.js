// backend/middleware/auth.js
// Owner: Aarian (everyone uses it)
//
// Usage in any route file:
//   const { verifyToken, requireRole } = require('../middleware/auth');
//   router.get('/something', verifyToken, requireRole('HR_ADMIN'), controller.fn);
//
// After verifyToken, req.user = { user_id, full_name, email, role, profile_picture_url }
const { pool } = require('../config/db');
const { verifyJwt } = require('../utils/token');

async function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Please log in to continue.' });
  }

  let payload;
  try {
    payload = verifyJwt(token);
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      message: expired ? 'Your session has expired. Please log in again.' : 'Please log in to continue.',
      code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
    });
  }

  try {
    // Check the account still exists and is active (deleted interviewers are blocked, BR-18)
    const { rows } = await pool.query(
      `SELECT user_id, full_name, email, role, status, profile_picture_url
         FROM users WHERE user_id = $1`,
      [payload.user_id]
    );
    const user = rows[0];
    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ message: 'Your account is no longer active.', code: 'ACCOUNT_INACTIVE' });
    }
    delete user.status;
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

// requireRole('HR_ADMIN') or requireRole('HR_ADMIN', 'INTERVIEWER')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }
    return next();
  };
}

module.exports = { verifyToken, requireRole };
