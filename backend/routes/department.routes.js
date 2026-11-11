const express = require('express');
const department = require('../controllers/department.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', department.listDepartments);                    
router.post('/', verifyToken, requireRole('HR_ADMIN'), department.createDepartment); // HR only

module.exports = router;
