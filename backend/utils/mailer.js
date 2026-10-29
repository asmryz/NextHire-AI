// backend/utils/mailer.js
// Owner: Aarian (Shivani uses sendMail() for the submission email)
// Sends email through Gmail (Nodemailer + Gmail App Password).
// If EMAIL_USER / EMAIL_APP_PASSWORD are missing in .env, the email is printed
// in the terminal instead, so development still works.
require('dotenv').config();
const nodemailer = require('nodemailer');

const hasGmail = Boolean(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD);

const transporter = hasGmail
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD },
    })
  : null;

const FROM = `"NexHire AI" <${process.env.EMAIL_USER || 'no-reply@nexhire.local'}>`;

async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    console.log('\n----- EMAIL (dev mode, not really sent) -----');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log(text || html);
    console.log('---------------------------------------------\n');
    return { dev: true };
  }
  return transporter.sendMail({ from: FROM, to, subject, html, text });
}

// Shared email look (brand colours) so every email matches the app.
function layout(title, bodyHtml) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#FFFBEF;padding:24px;color:#4D2A00">
    <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #F3DC99;border-radius:12px;overflow:hidden">
      <div style="background:#4D2A00;color:#F9E6A8;padding:16px 24px;font-size:18px;font-weight:bold">NexHire AI</div>
      <div style="padding:24px">
        <h2 style="margin:0 0 12px;font-size:20px;color:#4D2A00">${title}</h2>
        ${bodyHtml}
      </div>
    </div>
  </div>`;
}

module.exports = { sendMail, layout };
