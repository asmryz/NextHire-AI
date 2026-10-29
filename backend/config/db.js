// backend/config/db.js
// Owner: Aarian
// Neon PostgreSQL connection pool. Use `pool.query(...)` everywhere.
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: 10,
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() AS time, current_database() AS db');
    console.log(`Neon connected: ${result.rows[0].db} at ${result.rows[0].time}`);
  } catch (err) {
    console.error('Neon connection failed:', err.code, err.message || err.errors);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
