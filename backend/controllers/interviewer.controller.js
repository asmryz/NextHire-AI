// backend/controllers/interviewer.controller.js
// Owner: Aarian
// SRS 4.1 "Manage Interviewer Accounts" (REQ-7, BR-14, BR-18):
//   HR Admin creates an interviewer account (login details are emailed),
//   views it with its assigned interviews and feedback, and deletes it.
//   Delete = login blocked (status DELETED); past interviews and feedback stay in the records.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { sendMail, layout } = require('../utils/mailer');
const { logAudit } = require('../utils/audit');
const { isEmail, isPhone, cleanEmail, cleanPhone, MESSAGES } = require('../utils/validators');

const toInt = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// 10-character temporary password with letters and numbers (meets the password rule)
function tempPassword() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = letters + digits;
  const pick = (set) => set[crypto.randomInt(0, set.length)];
  const chars = [pick(letters), pick(letters), pick(digits), pick(digits)];
  while (chars.length < 10) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

// GET /api/interviewers?search=&include_deleted=true
async function listInterviewers(req, res) {
  const search = req.query.search ? String(req.query.search).trim() : null;
  const includeDeleted = req.query.include_deleted === 'true';
  try {
    const { rows } = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.status, u.profile_picture_url, u.created_at, u.last_login_at,
              ip.designation, ip.phone, d.department_id, d.name AS department,
              (SELECT COUNT(*)::int FROM interview_panel p WHERE p.interviewer_id = u.user_id) AS interviews_assigned
         FROM users u
         JOIN interviewer_profile ip ON ip.user_id = u.user_id
         JOIN department d ON d.department_id = ip.department_id
        WHERE u.role = 'INTERVIEWER'
          AND ($1::boolean OR u.status = 'ACTIVE')
          AND ($2::text IS NULL OR u.full_name ILIKE '%' || $2 || '%' OR u.email ILIKE '%' || $2 || '%' OR d.name ILIKE '%' || $2 || '%')
        ORDER BY u.status, u.full_name`,
      [includeDeleted, search]
    );
    return res.json({ interviewers: rows });
  } catch (err) {
    console.error('listInterviewers:', err);
    return res.status(500).json({ message: 'Unable to load interviewers. Please refresh.' });
  }
}

// POST /api/interviewers   Body: full_name, email, department_id, designation, phone
async function createInterviewer(req, res) {
  const b = req.body || {};
  const errors = {};
  const fullName = String(b.full_name || '').trim();
  const email = String(b.email || '').trim();
  const departmentId = toInt(b.department_id);
  const designation = b.designation ? String(b.designation).trim() : null;
  const phone = b.phone ? String(b.phone).trim() : null;

  if (!fullName) errors.full_name = 'This field is required.';
  else if (fullName.length > 100) errors.full_name = 'Name must be 100 characters or fewer.';
  if (!email) errors.email = 'This field is required.';
  else if (!isEmail(email)) errors.email = MESSAGES.email;
  if (!departmentId) errors.department_id = 'Please select a department.';
  if (designation && designation.length > 100) errors.designation = 'Must be 100 characters or fewer.';
  if (phone && !isPhone(phone)) errors.phone = MESSAGES.phone;
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
  }

  const password = tempPassword();
  const client = await pool.connect();
  let userId;
  try {
    const exists = await client.query('SELECT 1 FROM users WHERE email = $1', [cleanEmail(email)]);
    if (exists.rows.length) {
      return res.status(409).json({ message: 'This email is already registered.', errors: { email: 'This email is already registered.' } });
    }

    const hash = await bcrypt.hash(password, 10);
    await client.query('BEGIN');
    const u = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'INTERVIEWER') RETURNING user_id`,
      [fullName, cleanEmail(email), hash]
    );
    userId = u.rows[0].user_id;
    await client.query(
      `INSERT INTO interviewer_profile (user_id, department_id, designation, phone, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, departmentId, designation, phone ? cleanPhone(phone) : null, req.user.user_id]
    );
    await logAudit(client, req.user.user_id, 'interviewer', userId, 'CREATE', cleanEmail(email));
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(409).json({ message: 'This email is already registered.' });
    if (err.code === '23503') return res.status(400).json({ message: 'Please select a valid department.', errors: { department_id: 'Please select a valid department.' } });
    console.error('createInterviewer:', err);
    return res.status(500).json({ message: 'Account could not be created. Please try again.' });
  } finally {
    client.release();
  }

  // Email the login details. If it fails the account still exists (SRS exception flow).
  const portal = process.env.FRONTEND_URL || 'http://localhost:5173';
  const subject = 'Your NexHire AI interviewer account';
  let emailSent = true;
  let emailId = null;
  try {
    const log = await pool.query(
      `INSERT INTO email_log (recipient_id, email_type, subject, status)
       VALUES ($1, 'ACCOUNT_CREATED', $2, 'QUEUED') RETURNING email_id`,
      [userId, subject]
    );
    emailId = log.rows[0].email_id;
    await sendMail({
      to: cleanEmail(email),
      subject,
      text: `Hi ${fullName}, an interviewer account was created for you on NexHire AI. Login: ${portal}/login  Email: ${cleanEmail(email)}  Temporary password: ${password}  Please change it using "Forgot Password" after your first login.`,
      html: layout(
        'Your interviewer account is ready',
        `<p>Hi ${fullName},</p>
         <p>The HR team has created an interviewer account for you. You will only see the interviews assigned to you.</p>
         <table style="border-collapse:collapse;margin:12px 0;font-size:14px">
           <tr><td style="padding:4px 12px 4px 0;color:#7A4A12">Email</td><td style="padding:4px 0;font-weight:bold">${cleanEmail(email)}</td></tr>
           <tr><td style="padding:4px 12px 4px 0;color:#7A4A12">Temporary password</td><td style="padding:4px 0;font-weight:bold;font-family:monospace">${password}</td></tr>
         </table>
         <p><a href="${portal}/login" style="display:inline-block;background:#F2A900;color:#4D2A00;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Log in</a></p>
         <p>For your security, set your own password with <b>Forgot Password</b> on the login page.</p>`
      ),
    });
    await pool.query(`UPDATE email_log SET status = 'SENT', sent_at = now() WHERE email_id = $1`, [emailId]);
  } catch (err) {
    emailSent = false;
    console.error('Interviewer account email failed:', err.message);
    if (emailId) {
      await pool.query(`UPDATE email_log SET status = 'FAILED', retry_count = retry_count + 1 WHERE email_id = $1`, [emailId]).catch(() => {});
    }
  }

  return res.status(201).json({
    message: emailSent
      ? 'Interviewer account created. Login details were emailed to the interviewer.'
      : 'Interviewer account created, but the email could not be sent. Share the temporary password below with the interviewer.',
    email_sent: emailSent,
    // Shown to HR once, so the account is usable even if the email did not arrive
    temporary_password: password,
    user_id: userId,
  });
}

// GET /api/interviewers/:id   account + assigned interviews + recorded feedback
async function getInterviewer(req, res) {
  const id = toInt(req.params.id);
  if (!id) return res.status(404).json({ message: 'Interviewer not found.' });
  try {
    const { rows } = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.status, u.profile_picture_url, u.created_at, u.last_login_at,
              ip.designation, ip.phone, d.name AS department, cb.full_name AS created_by_name
         FROM users u
         JOIN interviewer_profile ip ON ip.user_id = u.user_id
         JOIN department d ON d.department_id = ip.department_id
         LEFT JOIN users cb ON cb.user_id = ip.created_by
        WHERE u.user_id = $1 AND u.role = 'INTERVIEWER'`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Interviewer not found.' });

    const [interviews, feedback] = await Promise.all([
      pool.query(
        `SELECT i.interview_id, i.status, v.title AS vacancy, c.full_name AS candidate,
                to_char(s.slot_date, 'YYYY-MM-DD') AS slot_date,
                to_char(s.start_time, 'HH24:MI') AS start_time, s.venue
           FROM interview_panel p
           JOIN interview i   ON i.interview_id = p.interview_id
           JOIN application a ON a.application_id = i.application_id
           JOIN vacancy v     ON v.vacancy_id = a.vacancy_id
           JOIN users c       ON c.user_id = a.candidate_id
           LEFT JOIN interview_slot s ON s.slot_id = i.slot_id
          WHERE p.interviewer_id = $1
          ORDER BY s.slot_date DESC NULLS LAST, i.interview_id DESC`,
        [id]
      ),
      pool.query(
        `SELECT f.feedback_id, f.interview_id, LEFT(COALESCE(f.notes, ''), 200) AS notes, f.created_at
           FROM interview_feedback f WHERE f.author_id = $1 ORDER BY f.created_at DESC`,
        [id]
      ),
    ]);

    return res.json({ interviewer: rows[0], interviews: interviews.rows, feedback: feedback.rows });
  } catch (err) {
    console.error('getInterviewer:', err);
    return res.status(500).json({ message: 'Unable to load the interviewer. Please refresh.' });
  }
}

// DELETE /api/interviewers/:id   blocks login, keeps history (BR-18)
async function deleteInterviewer(req, res) {
  const id = toInt(req.params.id);
  if (!id) return res.status(404).json({ message: 'Interviewer not found.' });
  try {
    const { rows } = await pool.query(
      `UPDATE users SET status = 'DELETED'
        WHERE user_id = $1 AND role = 'INTERVIEWER' AND status = 'ACTIVE'
        RETURNING email`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Interviewer not found or already deleted.' });
    await logAudit(pool, req.user.user_id, 'interviewer', id, 'DELETE', rows[0].email);
    return res.json({ message: 'Interviewer account deleted. They can no longer log in; their past interviews and feedback are kept.' });
  } catch (err) {
    console.error('deleteInterviewer:', err);
    return res.status(500).json({ message: 'Account could not be deleted. Please try again.' });
  }
}

module.exports = { listInterviewers, createInterviewer, getInterviewer, deleteInterviewer, _private: { tempPassword } };
