// backend/routes/inbox.routes.js
// Owner: Shivani
// HR Admin only. Mounted at /api/inbox in server.js.
const express = require('express');
const inbox = require('../controllers/inbox.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken, requireRole('HR_ADMIN'));

router.get('/', inbox.listInbox);
router.get('/analytics', inbox.analytics);        // HR dashboard charts
router.get('/vacancies', inbox.inboxVacancies);
router.get('/:id', inbox.getApplication);
router.put('/:id/referral', inbox.saveReferral);   // mark as referred by an employee
router.delete('/:id/referral', inbox.removeReferral);

module.exports = router;
