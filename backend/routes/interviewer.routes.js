// backend/routes/interviewer.routes.js
// Owner: Aarian
// HR Admin only (BR-14). Mounted at /api/interviewers in server.js.
const express = require('express');
const interviewer = require('../controllers/interviewer.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken, requireRole('HR_ADMIN'));

router.get('/', interviewer.listInterviewers);
router.post('/', interviewer.createInterviewer);
router.get('/:id', interviewer.getInterviewer);
router.delete('/:id', interviewer.deleteInterviewer);

module.exports = router;
