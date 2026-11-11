// Neon PostgreSQL connection pool. Use `pool.query(...)` everywhere.
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: 10,
  idleTimeoutMillis: 10000,       // close our idle connections after 10 s
  connectionTimeoutMillis: 15000, // give a sleeping Neon database time to wake up
  keepAlive: true,
});

// An idle connection closed by Neon: just log it, the pool opens a new one next time
pool.on('error', (err) => {
  console.warn('Neon: idle connection closed, will reconnect.', err.message);
});

const TRANSIENT_CODES = ['ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ECONNREFUSED', '57P01', '57P02', '57P03', '08000', '08001', '08003', '08006'];
function isTransient(err) {
  const msg = String(err?.message || '');
  return TRANSIENT_CODES.includes(err?.code) || /Connection terminated|connection timeout|timeout exceeded|Client has encountered a connection error/i.test(msg);
}

// pool.query with one automatic retry for connection problems
const rawQuery = pool.query.bind(pool);
pool.query = async (...args) => {
  try {
    return await rawQuery(...args);
  } catch (err) {
    if (!isTransient(err)) throw err;
    console.warn('Neon: connection problem, retrying once:', err.code || err.message);
    await new Promise((r) => setTimeout(r, 500));
    return rawQuery(...args);
  }
};

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() AS time, current_database() AS db');
    console.log(`Neon connected: ${result.rows[0].db} at ${result.rows[0].time}`);
  } catch (err) {
    console.error('Neon connection failed:', err.code, err.message || err.errors);
    process.exit(1);
  }
}

module.exports = { pool, testConnection, isTransient };
