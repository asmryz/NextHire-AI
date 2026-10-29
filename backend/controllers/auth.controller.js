// backend/controllers/auth.controller.js
// Owner: Aarian
// SRS 4.1: Sign Up (with email OTP), Login, Forgot / Reset Password, Me.
// Logout is done on the frontend by deleting the token (REQ-8).
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { sendMail, layout } = require('../utils/mailer');
const { signToken, generateOtp, generateResetToken, sha256 } = require('../utils/token');
const v = require('../utils/validators');

const OTP_MINUTES = 10;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const RESET_MINUTES = 30;
const BCRYPT_ROUNDS = 10;
const UNAVAILABLE = 'System temporarily unavailable. Please try again later.';

const publicUser = (u) => ({
  user_id: u.user_id,
  full_name: u.full_name,
  email: u.email,
  role: u.role,
  profile_picture_url: u.profile_picture_url || null,
});

// Is this email or CNIC already registered? Returns an error message or null.
async function findExistingAccount(email, cnic) {
  const { rows } = await pool.query(
    `SELECT 1 FROM users WHERE email = $1
     UNION ALL
     SELECT 1 FROM candidate_profile WHERE cnic = $2
     LIMIT 1`,
    [email, cnic]
  );
  return rows.length ? 'An account with this email or CNIC already exists. Please log in.' : null;
}

// ---------------------------------------------------------------------
// POST /api/auth/register/send-otp
// Body: full_name, cnic, email, phone, password, confirm_password
// Validates the whole form, then emails a 6-digit OTP.
// ---------------------------------------------------------------------
async function sendRegisterOtp(req, res) {
  const errors = v.validateSignUp(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
  }

  const email = v.cleanEmail(req.body.email);
  const cnic = v.cleanCnic(req.body.cnic);

  try {
    const exists = await findExistingAccount(email, cnic);
    if (exists) return res.status(409).json({ message: exists });

    // Stop spamming: one OTP per email every 60 seconds
    const recent = await pool.query(
      `SELECT created_at FROM email_otp
        WHERE email = $1 AND purpose = 'REGISTER'
          AND created_at > now() - make_interval(secs => $2)
        ORDER BY created_at DESC LIMIT 1`,
      [email, OTP_RESEND_SECONDS]
    );
    if (recent.rows.length) {
      return res.status(429).json({ message: `Please wait ${OTP_RESEND_SECONDS} seconds before requesting a new code.` });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);

    await pool.query(
      `INSERT INTO email_otp (email, purpose, otp_hash, expires_at)
       VALUES ($1, 'REGISTER', $2, now() + make_interval(mins => $3))`,
      [email, otpHash, OTP_MINUTES]
    );

    await sendMail({
      to: email,
      subject: `Your NexHire AI verification code: ${otp}`,
      text: `Your NexHire AI verification code is ${otp}. It expires in ${OTP_MINUTES} minutes.`,
      html: layout(
        'Verify your email',
        `<p>Use this code to finish creating your account:</p>
         <p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#F9E6A8;padding:12px 16px;border-radius:8px;display:inline-block">${otp}</p>
         <p>This code expires in ${OTP_MINUTES} minutes. If you did not sign up, ignore this email.</p>`
      ),
    });

    return res.json({ message: `We sent a 6-digit code to ${email}.`, expires_in_minutes: OTP_MINUTES });
  } catch (err) {
    console.error('sendRegisterOtp:', err);
    return res.status(500).json({ message: UNAVAILABLE });
  }
}

// ---------------------------------------------------------------------
// POST /api/auth/register/verify
// Body: same fields as send-otp + otp
// Checks the OTP and only then creates the account (user + candidate_profile).
// ---------------------------------------------------------------------
async function verifyRegisterOtp(req, res) {
  const errors = v.validateSignUp(req.body);
  const otp = String(req.body.otp || '').trim();
  if (!/^\d{6}$/.test(otp)) errors.otp = 'Please enter the 6-digit code.';
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
  }

  const email = v.cleanEmail(req.body.email);
  const cnic = v.cleanCnic(req.body.cnic);
  const phone = v.cleanPhone(req.body.phone);
  const fullName = req.body.full_name.trim();

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT otp_id, otp_hash, expires_at, attempts
         FROM email_otp
        WHERE email = $1 AND purpose = 'REGISTER' AND verified_at IS NULL
        ORDER BY created_at DESC LIMIT 1`,
      [email]
    );
    const record = rows[0];

    if (!record) {
      return res.status(400).json({ message: 'No code found for this email. Please request a new one.' });
    }
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ message: 'This code has expired. Please request a new one.' });
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: 'Too many wrong attempts. Please request a new code.' });
    }

    const ok = await bcrypt.compare(otp, record.otp_hash);
    if (!ok) {
      await client.query('UPDATE email_otp SET attempts = attempts + 1 WHERE otp_id = $1', [record.otp_id]);
      const left = OTP_MAX_ATTEMPTS - record.attempts - 1;
      return res.status(400).json({
        message: left > 0 ? `Incorrect code. ${left} attempt(s) left.` : 'Too many wrong attempts. Please request a new code.',
        errors: { otp: 'Incorrect code.' },
      });
    }

    const exists = await findExistingAccount(email, cnic);
    if (exists) return res.status(409).json({ message: exists });

    const passwordHash = await bcrypt.hash(req.body.password, BCRYPT_ROUNDS);

    // All or nothing: no partial account if anything fails (SRS exception flow)
    await client.query('BEGIN');
    const userRes = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'CANDIDATE')
       RETURNING user_id`,
      [fullName, email, passwordHash]
    );
    await client.query(
      `INSERT INTO candidate_profile (user_id, cnic, phone) VALUES ($1, $2, $3)`,
      [userRes.rows[0].user_id, cnic, phone]
    );
    await client.query('UPDATE email_otp SET verified_at = now() WHERE otp_id = $1', [record.otp_id]);
    await client.query('COMMIT');

    return res.status(201).json({ message: 'Account created, please log in.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      // unique violation (email or CNIC registered at the same moment)
      return res.status(409).json({ message: 'An account with this email or CNIC already exists. Please log in.' });
    }
    console.error('verifyRegisterOtp:', err);
    return res.status(500).json({ message: UNAVAILABLE });
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------
// POST /api/auth/login   Body: email, password
// ---------------------------------------------------------------------
async function login(req, res) {
  const { email, password } = req.body || {};
  const errors = {};
  if (!email) errors.email = v.MESSAGES.required;
  else if (!v.isEmail(email)) errors.email = v.MESSAGES.email;
  if (!password) errors.password = v.MESSAGES.required;
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
  }

  try {
    const { rows } = await pool.query(
      `SELECT user_id, full_name, email, password_hash, role, status, profile_picture_url
         FROM users WHERE email = $1`,
      [v.cleanEmail(email)]
    );
    const user = rows[0];
    const valid = user && user.status === 'ACTIVE' && (await bcrypt.compare(password, user.password_hash));
    if (!valid) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }

    await pool.query('UPDATE users SET last_login_at = now() WHERE user_id = $1', [user.user_id]);

    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('login:', err);
    return res.status(500).json({ message: UNAVAILABLE });
  }
}

// ---------------------------------------------------------------------
// GET /api/auth/me   (needs token) -> the logged-in user
// ---------------------------------------------------------------------
function me(req, res) {
  return res.json({ user: publicUser(req.user) });
}

// ---------------------------------------------------------------------
// POST /api/auth/forgot-password   Body: email
// Always gives the same answer so nobody can check which emails exist.
// ---------------------------------------------------------------------
async function forgotPassword(req, res) {
  const { email } = req.body || {};
  if (!email || !v.isEmail(email)) {
    return res.status(400).json({ message: v.MESSAGES.email, errors: { email: v.MESSAGES.email } });
  }
  const sameAnswer = { message: 'If this email is registered, a reset link has been sent.' };

  try {
    const { rows } = await pool.query(
      `SELECT user_id, full_name, email FROM users WHERE email = $1 AND status = 'ACTIVE'`,
      [v.cleanEmail(email)]
    );
    const user = rows[0];
    if (!user) return res.json(sameAnswer);

    const token = generateResetToken();
    await pool.query(
      `INSERT INTO password_reset (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + make_interval(mins => $3))`,
      [user.user_id, sha256(token), RESET_MINUTES]
    );

    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${frontend}/reset-password?token=${token}`;

    await sendMail({
      to: user.email,
      subject: 'Reset your NexHire AI password',
      text: `Open this link to reset your password (valid ${RESET_MINUTES} minutes): ${link}`,
      html: layout(
        'Reset your password',
        `<p>Hi ${user.full_name},</p>
         <p>Click the button below to choose a new password. The link is valid for ${RESET_MINUTES} minutes.</p>
         <p><a href="${link}" style="display:inline-block;background:#F2A900;color:#4D2A00;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Reset password</a></p>
         <p>If you did not ask for this, you can ignore this email.</p>`
      ),
    });

    return res.json(sameAnswer);
  } catch (err) {
    console.error('forgotPassword:', err);
    return res.status(500).json({ message: UNAVAILABLE });
  }
}

// ---------------------------------------------------------------------
// POST /api/auth/reset-password   Body: token, password, confirm_password
// ---------------------------------------------------------------------
async function resetPassword(req, res) {
  const { token, password, confirm_password } = req.body || {};
  const errors = {};
  if (!password) errors.password = v.MESSAGES.required;
  else if (!v.isStrongPassword(password)) errors.password = v.MESSAGES.password;
  if (password !== confirm_password) errors.confirm_password = v.MESSAGES.confirm;
  if (!token) return res.status(400).json({ message: 'This reset link is invalid. Please request a new one.' });
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT reset_id, user_id, expires_at, used_at
         FROM password_reset WHERE token_hash = $1`,
      [sha256(token)]
    );
    const reset = rows[0];
    if (!reset || reset.used_at || new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ message: 'This reset link has expired. Please request a new one.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await client.query('BEGIN');
    await client.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [passwordHash, reset.user_id]);
    await client.query('UPDATE password_reset SET used_at = now() WHERE reset_id = $1', [reset.reset_id]);
    await client.query('COMMIT');

    return res.json({ message: 'Password reset successful, please log in.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('resetPassword:', err);
    return res.status(500).json({ message: UNAVAILABLE });
  } finally {
    client.release();
  }
}

module.exports = { sendRegisterOtp, verifyRegisterOtp, login, me, forgotPassword, resetPassword };
