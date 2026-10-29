// backend/utils/applicationEmails.js
// Owner: Shivani
// Application submission confirmation email (SRS REQ-22).
// Call it from the Apply controller AFTER the application is saved:
//
//   const { sendApplicationConfirmation } = require('../utils/applicationEmails');
//   sendApplicationConfirmation(applicationId);   // no await needed: never blocks the response
//
// If the email fails, the application is still saved; the row in email_log stays
// QUEUED/FAILED with retry_count so it can be retried later (SRS exception flow).
const { pool } = require('../config/db');
const { sendMail, layout } = require('./mailer');

async function sendApplicationConfirmation(applicationId) {
  let emailId = null;
  try {
    const { rows } = await pool.query(
      `SELECT a.application_id, a.submitted_at,
              u.user_id, u.full_name, u.email,
              v.title AS vacancy_title, d.name AS department
         FROM application a
         JOIN users u      ON u.user_id = a.candidate_id
         JOIN vacancy v    ON v.vacancy_id = a.vacancy_id
         JOIN department d ON d.department_id = v.department_id
        WHERE a.application_id = $1`,
      [applicationId]
    );
    const app = rows[0];
    if (!app) return;

    const subject = `Application received: ${app.vacancy_title}`;

    // 1. Log it first as QUEUED
    const logRes = await pool.query(
      `INSERT INTO email_log (recipient_id, application_id, email_type, subject, status)
       VALUES ($1, $2, 'CONFIRMATION', $3, 'QUEUED')
       RETURNING email_id`,
      [app.user_id, app.application_id, subject.slice(0, 200)]
    );
    emailId = logRes.rows[0].email_id;

    const submitted = new Date(app.submitted_at).toLocaleString('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Karachi',
    });
    const portal = process.env.FRONTEND_URL || 'http://localhost:5173';

    // 2. Send
    await sendMail({
      to: app.email,
      subject,
      text: `Hi ${app.full_name}, we received your application for ${app.vacancy_title} (${app.department}) on ${submitted}. You can track its progress in My Applications: ${portal}/candidate/applications`,
      html: layout(
        'We received your application',
        `<p>Hi ${app.full_name},</p>
         <p>Thank you for applying. Your application has been submitted successfully.</p>
         <table style="border-collapse:collapse;margin:12px 0;font-size:14px">
           <tr><td style="padding:4px 12px 4px 0;color:#7A4A12">Position</td><td style="padding:4px 0;font-weight:bold">${app.vacancy_title}</td></tr>
           <tr><td style="padding:4px 12px 4px 0;color:#7A4A12">Department</td><td style="padding:4px 0">${app.department}</td></tr>
           <tr><td style="padding:4px 12px 4px 0;color:#7A4A12">Submitted</td><td style="padding:4px 0">${submitted}</td></tr>
           <tr><td style="padding:4px 12px 4px 0;color:#7A4A12">Reference</td><td style="padding:4px 0">#${app.application_id}</td></tr>
         </table>
         <p>You can follow your application stage at any time:</p>
         <p><a href="${portal}/candidate/applications" style="display:inline-block;background:#F2A900;color:#4D2A00;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">View My Applications</a></p>`
      ),
    });

    // 3. Mark as sent
    await pool.query(`UPDATE email_log SET status = 'SENT', sent_at = now() WHERE email_id = $1`, [emailId]);
  } catch (err) {
    console.error('Confirmation email failed:', err.message);
    if (emailId) {
      await pool
        .query(`UPDATE email_log SET status = 'FAILED', retry_count = retry_count + 1 WHERE email_id = $1`, [emailId])
        .catch(() => {});
    }
  }
}

module.exports = { sendApplicationConfirmation };
