// backend/routes/inbox.routes.js
// Owner: Shivani
// HR Admin only. Mounted at /api/inbox in server.js.
const express = require('express');
const inbox = require('../controllers/inbox.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken, requireRole('HR_ADMIN'));

router.get('/', inbox.listInbox);
router.get('/vacancies', inbox.inboxVacancies);
router.get('/:id', inbox.getApplication);

module.exports = router;
