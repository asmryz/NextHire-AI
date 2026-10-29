// backend/controllers/department.controller.js
// Owner: Shivani
const { pool } = require('../config/db');

// GET /api/departments  -> list for dropdowns (vacancy form, filters)
async function listDepartments(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT department_id, name, description FROM department ORDER BY name'
    );
    return res.json({ departments: rows });
  } catch (err) {
    console.error('listDepartments:', err);
    return res.status(500).json({ message: 'Unable to load departments. Please refresh.' });
  }
}

// POST /api/departments  (HR only)  Body: name, description
async function createDepartment(req, res) {
  const name = String(req.body?.name || '').trim();
  const description = req.body?.description ? String(req.body.description).trim() : null;

  if (!name) return res.status(400).json({ message: 'Department name is required.', errors: { name: 'This field is required.' } });
  if (name.length > 100) return res.status(400).json({ message: 'Name must be 100 characters or fewer.' });

  try {
    const { rows } = await pool.query(
      'INSERT INTO department (name, description) VALUES ($1, $2) RETURNING department_id, name, description',
      [name, description]
    );
    return res.status(201).json({ department: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'This department already exists.' });
    console.error('createDepartment:', err);
    return res.status(500).json({ message: 'System temporarily unavailable. Please try again later.' });
  }
}

module.exports = { listDepartments, createDepartment };
