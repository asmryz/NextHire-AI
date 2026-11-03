// backend/controllers/application.controller.js
// Owner: Shivani
// SRS 4.3 Candidate Portal (apply side):
//   REQ-19 position-specific structured form, no CV upload
//   REQ-20 mandatory fields, one application per vacancy, one active application at a time (BR-12)
//   REQ-21 optional portfolio / context link (not used for scoring)
//   REQ-22 submission confirmation email
//   REQ-23 list of submitted applications
// Candidates never see AI scores or internal decisions (SRS 5.3).
const { pool } = require('../config/db');
const { logAudit } = require('../utils/audit');
const { sendApplicationConfirmation } = require('../utils/applicationEmails');

const MAX_ANSWER = 2000;
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?\d{10,15}$/;
const CNIC_RE = /^\d{5}-\d{7}-\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const toInt = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const isValidDate = (s) => {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

// Checks one answer against its field. Returns { value, error }.
function checkAnswer(field, raw) {
  const value = raw === undefined || raw === null ? '' : String(raw).trim();
  if (!value) return { value: null, error: field.is_required ? 'This field is required' : null };
  if (value.length > MAX_ANSWER) return { value, error: `Answer must be ${MAX_ANSWER} characters or fewer.` };

  switch (field.field_type) {
    case 'NUMBER': {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) return { value, error: 'Please enter a valid number.' };
      return { value: String(n), error: null };
    }
    case 'DATE':
      return isValidDate(value) ? { value, error: null } : { value, error: 'Please enter a valid date.' };
    case 'URL':
      return URL_RE.test(value) ? { value, error: null } : { value, error: 'Please enter a valid URL' };
    case 'EMAIL':
      return EMAIL_RE.test(value) ? { value: value.toLowerCase(), error: null } : { value, error: 'Please enter a valid email address.' };
    case 'PHONE': {
      const p = value.replace(/[\s-]/g, '');
      return PHONE_RE.test(p) ? { value: p, error: null } : { value, error: 'Please enter a valid phone number.' };
    }
    case 'RADIO':
    case 'SELECT': {
      const options = Array.isArray(field.options) ? field.options : [];
      return options.includes(value) ? { value, error: null } : { value, error: 'Please choose one of the options.' };
    }
    case 'LIST': {
      // "React, , Node ,JS" -> "React, Node, JS"
      const items = value.split(',').map((s) => s.trim()).filter(Boolean);
      if (!items.length && field.is_required) return { value: null, error: 'This field is required' };
      return { value: items.join(', '), error: null };
    }
    default:
      if (field.field_key === 'cnic' && !CNIC_RE.test(value)) {
        return { value, error: 'Please enter a valid CNIC (XXXXX-XXXXXXX-X).' };
      }
      return { value, error: null };
  }
}

// Optional: tell the n8n AI Agent about the new application (final FYP-I).
// Set N8N_APPLICATION_WEBHOOK_URL in backend/.env when the workflow is ready.
function notifyAiAgent(applicationId) {
  const url = process.env.N8N_APPLICATION_WEBHOOK_URL;
  if (!url || typeof fetch !== 'function') return;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ application_id: applicationId, event: 'APPLICATION_SUBMITTED' }),
  }).catch((err) => console.error('n8n webhook failed (application stays pending):', err.message));
}

// ================================================================ APPLY

// POST /api/candidate/vacancies/:id/apply
// Body: { answers: { "<field_id>": "value", ... }, portfolio_link }
async function applyToVacancy(req, res) {
  const vacancyId = toInt(req.params.id);
  if (!vacancyId) return res.status(404).json({ message: 'Vacancy not found.' });
  const candidateId = req.user.user_id;
  const answers = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
  const portfolio = req.body?.portfolio_link ? String(req.body.portfolio_link).trim() : '';

  if (portfolio && (!URL_RE.test(portfolio) || portfolio.length > 255)) {
    return res.status(400).json({ message: 'Please correct the highlighted fields.', errors: { portfolio_link: 'Please enter a valid URL' } });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // One apply at a time per candidate (stops double-clicks creating two applications)
    await client.query('SELECT pg_advisory_xact_lock($1)', [candidateId]);

    const vac = await client.query(
      `SELECT vacancy_id, title,
              (status = 'OPEN'
                AND (start_date IS NULL OR start_date <= CURRENT_DATE)
                AND (end_date IS NULL OR end_date >= CURRENT_DATE)) AS is_open_now
         FROM vacancy WHERE vacancy_id = $1`,
      [vacancyId]
    );
    if (!vac.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Vacancy not found.' });
    }
    if (!vac.rows[0].is_open_now) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'This vacancy is no longer accepting applications.' });
    }

    const already = await client.query(
      'SELECT 1 FROM application WHERE vacancy_id = $1 AND candidate_id = $2',
      [vacancyId, candidateId]
    );
    if (already.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'You have already applied for this vacancy.' });
    }

    const active = await client.query(
      `SELECT 1 FROM application
        WHERE candidate_id = $1 AND is_active AND stage NOT IN ('HIRED', 'REJECTED') LIMIT 1`,
      [candidateId]
    );
    if (active.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'You already have an active application. You can apply for another vacancy once it is closed.' });
    }

    // Validate every answer against the vacancy's own form
    const fieldsRes = await client.query(
      `SELECT field_id, field_key, label, field_type, is_required, options
         FROM form_field WHERE vacancy_id = $1 ORDER BY display_order, field_id`,
      [vacancyId]
    );
    if (!fieldsRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'This vacancy has no application form yet.' });
    }

    const errors = {};
    const clean = [];
    for (const f of fieldsRes.rows) {
      const { value, error } = checkAnswer(f, answers[f.field_id] ?? answers[String(f.field_id)]);
      if (error) errors[f.field_id] = error;
      else if (value !== null) clean.push({ field_id: f.field_id, value });
    }
    if (Object.keys(errors).length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Please correct the highlighted fields.', errors: { answers: errors } });
    }

    const appRes = await client.query(
      `INSERT INTO application (vacancy_id, candidate_id, portfolio_link, stage)
       VALUES ($1, $2, $3, 'APPLIED')
       RETURNING application_id, submitted_at`,
      [vacancyId, candidateId, portfolio || null]
    );
    const applicationId = appRes.rows[0].application_id;

    for (const a of clean) {
      await client.query(
        'INSERT INTO application_answer (application_id, field_id, answer_value) VALUES ($1, $2, $3)',
        [applicationId, a.field_id, a.value]
      );
    }
    await client.query(
      `INSERT INTO stage_history (application_id, changed_by, from_stage, to_stage)
       VALUES ($1, $2, NULL, 'APPLIED')`,
      [applicationId, candidateId]
    );
    await logAudit(client, candidateId, 'application', applicationId, 'SUBMIT', vac.rows[0].title);
    await client.query('COMMIT');

    // After saving: email + AI Agent (failures never undo the application)
    sendApplicationConfirmation(applicationId);
    notifyAiAgent(applicationId);

    return res.status(201).json({
      message: 'Your application has been submitted. A confirmation email is on its way.',
      application_id: applicationId,
      submitted_at: appRes.rows[0].submitted_at,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(409).json({ message: 'You have already applied for this vacancy.' });
    console.error('applyToVacancy:', err);
    return res.status(500).json({ message: 'System temporarily unavailable. Please try again later.' });
  } finally {
    client.release();
  }
}

// ================================================================ MY APPLICATIONS

// GET /api/candidate/applications
async function listMyApplications(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT a.application_id, a.stage, a.is_active, a.submitted_at, a.updated_at,
              v.vacancy_id, v.title, v.location, v.status AS vacancy_status, d.name AS department,
              to_char(s.slot_date, 'YYYY-MM-DD') AS interview_date,
              to_char(s.start_time, 'HH24:MI') AS interview_time, s.venue AS interview_venue,
              i.status AS interview_status
         FROM application a
         JOIN vacancy v    ON v.vacancy_id = a.vacancy_id
         JOIN department d ON d.department_id = v.department_id
         LEFT JOIN interview i      ON i.application_id = a.application_id AND i.status IN ('SCHEDULED', 'POSTPONED')
         LEFT JOIN interview_slot s ON s.slot_id = i.slot_id
        WHERE a.candidate_id = $1
        ORDER BY a.submitted_at DESC`,
      [req.user.user_id]
    );
    return res.json({ applications: rows });
  } catch (err) {
    console.error('listMyApplications:', err);
    return res.status(500).json({ message: 'Unable to load your applications. Please refresh.' });
  }
}

// GET /api/candidate/applications/:id   (only the candidate's own application, BR-9)
async function getMyApplication(req, res) {
  const id = toInt(req.params.id);
  if (!id) return res.status(404).json({ message: 'Application not found.' });
  try {
    const { rows } = await pool.query(
      `SELECT a.application_id, a.stage, a.is_active, a.submitted_at, a.updated_at, a.portfolio_link,
              v.vacancy_id, v.title, v.location, d.name AS department
         FROM application a
         JOIN vacancy v    ON v.vacancy_id = a.vacancy_id
         JOIN department d ON d.department_id = v.department_id
        WHERE a.application_id = $1 AND a.candidate_id = $2`,
      [id, req.user.user_id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Application not found.' });

    const [answers, history] = await Promise.all([
      pool.query(
        `SELECT f.field_id, f.label, f.field_type, f.section, ans.answer_value
           FROM form_field f
           LEFT JOIN application_answer ans ON ans.field_id = f.field_id AND ans.application_id = $1
          WHERE f.vacancy_id = $2
          ORDER BY f.display_order, f.field_id`,
        [id, rows[0].vacancy_id]
      ),
      pool.query(
        `SELECT from_stage, to_stage, changed_at FROM stage_history
          WHERE application_id = $1 ORDER BY changed_at, history_id`,
        [id]
      ),
    ]);

    return res.json({ application: rows[0], answers: answers.rows, history: history.rows });
  } catch (err) {
    console.error('getMyApplication:', err);
    return res.status(500).json({ message: 'Unable to load the application. Please refresh.' });
  }
}

module.exports = { applyToVacancy, listMyApplications, getMyApplication, _private: { checkAnswer } };
