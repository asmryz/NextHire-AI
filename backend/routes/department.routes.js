// backend/routes/department.routes.js
// Owner: Shivani
const express = require('express');
const department = require('../controllers/department.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', department.listDepartments);                                        // anyone (candidates filter by department)
router.post('/', verifyToken, requireRole('HR_ADMIN'), department.createDepartment); // HR only

module.exports = router;
