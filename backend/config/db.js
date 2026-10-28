// backend/config/db.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() AS time, current_database() AS db');
    console.log(`Neon connected: ${result.rows[0].db} at ${result.rows[0].time}`);
  } catch (err) {
    console.error('Neon connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };