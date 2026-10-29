// backend/routes/vacancy.routes.js
// Owner: Aarian
// HR Admin vacancy management. Candidates see vacancies through Shivani's
// routes/candidate.routes.js (open vacancies only).
const express = require('express');
const vacancy = require('../controllers/vacancy.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken, requireRole('HR_ADMIN'));

router.get('/', vacancy.listVacancies);
router.get('/stats', vacancy.vacancyStats);
router.get('/:id', vacancy.getVacancy);
router.post('/', vacancy.createVacancy);
router.put('/:id', vacancy.updateVacancy);
router.post('/:id/generate-form', vacancy.generateForm);
router.put('/:id/form', vacancy.saveForm);
router.post('/:id/publish', vacancy.publishVacancy);
router.post('/:id/close', vacancy.closeVacancy);
router.delete('/:id', vacancy.deleteVacancy);

module.exports = router;
