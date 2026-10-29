// backend/scripts/createHrAdmin.js
// Owner: Aarian
// HR Admin can't sign up from the website (only candidates can).
// Run ONCE from the backend folder:
//   node scripts/createHrAdmin.js "HR Admin" hr@company.com "StrongPass123"
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { isEmail, isStrongPassword, cleanEmail, MESSAGES } = require('../utils/validators');

async function main() {
  const [fullName, email, password] = process.argv.slice(2);
  if (!fullName || !email || !password) {
    console.log('Usage: node scripts/createHrAdmin.js "Full Name" email@example.com "Password123"');
    process.exit(1);
  }
  if (!isEmail(email)) throw new Error(MESSAGES.email);
  if (!isStrongPassword(password)) throw new Error(MESSAGES.password);

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, 'HR_ADMIN')
     ON CONFLICT (email) DO NOTHING
     RETURNING user_id`,
    [fullName.trim(), cleanEmail(email), hash]
  );

  if (rows.length) console.log(`HR Admin created (user_id ${rows[0].user_id}). You can now log in.`);
  else console.log('This email is already registered. Nothing changed.');
}

main()
  .catch((err) => {
    console.error('Failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
