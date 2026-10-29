// backend/controllers/vacancy.controller.js
// Owner: Aarian
// SRS 4.2 Job Vacancy Module (HR Admin only, BR-1):
//   create / edit / delete / close / search vacancies, start + end date,
//   requirements with mandatory flag + weightage (must total 100%, BR-11),
//   Generic Form Mechanism: generate a position-specific form from the requirements,
//   let HR adjust it, then publish.
const { pool } = require('../config/db');
const { logAudit } = require('../utils/audit');

const UNAVAILABLE = 'Vacancy could not be saved. Please try again.';
const REQ_TYPES = ['SKILL', 'EXPERIENCE', 'QUALIFICATION', 'CERTIFICATION'];
const FIELD_TYPES = ['TEXT', 'NUMBER', 'DATE', 'LIST', 'URL'];
const STATUSES = ['DRAFT', 'OPEN', 'CLOSED', 'FILLED'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ------------------------------------------------------------------ helpers

const toInt = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// SELECT list used everywhere (dates as plain 'YYYY-MM-DD' strings, no timezone shift)
const VACANCY_COLUMNS = `
  v.vacancy_id, v.title, v.description, v.location, v.status,
  v.department_id, d.name AS department,
  to_char(v.start_date, 'YYYY-MM-DD') AS start_date,
  to_char(v.end_date,   'YYYY-MM-DD') AS end_date,
  v.published_at, v.closed_at, v.created_by,
  (SELECT COUNT(*)::int FROM application a WHERE a.vacancy_id = v.vacancy_id) AS applicants`;

async function countApplications(db, vacancyId) {
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM application WHERE vacancy_id = $1', [vacancyId]);
  return rows[0].n;
}

async function loadVacancy(db, vacancyId) {
  const { rows } = await db.query(
    `SELECT ${VACANCY_COLUMNS}
       FROM vacancy v JOIN department d ON d.department_id = v.department_id
      WHERE v.vacancy_id = $1`,
    [vacancyId]
  );
  return rows[0] || null;
}

async function loadRequirements(db, vacancyId) {
  const { rows } = await db.query(
    `SELECT requirement_id, req_type, name, min_value, is_mandatory, weightage::float AS weightage
       FROM vacancy_requirement WHERE vacancy_id = $1 ORDER BY requirement_id`,
    [vacancyId]
  );
  return rows;
}

async function loadFormFields(db, vacancyId) {
  const { rows } = await db.query(
    `SELECT field_id, requirement_id, label, field_type, is_required, display_order
       FROM form_field WHERE vacancy_id = $1 ORDER BY display_order, field_id`,
    [vacancyId]
  );
  return rows;
}

async function fullVacancy(db, vacancyId) {
  const vacancy = await loadVacancy(db, vacancyId);
  if (!vacancy) return null;
  const [requirements, form_fields] = await Promise.all([loadRequirements(db, vacancyId), loadFormFields(db, vacancyId)]);
  const total_weightage = Math.round(requirements.reduce((s, r) => s + r.weightage, 0) * 100) / 100;
  return { ...vacancy, requirements, form_fields, total_weightage };
}

// Validates title/description/department/location/dates/requirements.
// Returns { errors, data }.
function validateVacancyBody(body = {}) {
  const errors = {};
  const title = String(body.title || '').trim();
  const description = body.description ? String(body.description).trim() : null;
  const location = body.location ? String(body.location).trim() : null;
  const department_id = toInt(body.department_id);
  const start_date = body.start_date || null;
  const end_date = body.end_date || null;

  if (!title) errors.title = 'Title is required';
  else if (title.length > 150) errors.title = 'Title must be 150 characters or fewer.';
  if (!department_id) errors.department_id = 'Please select a department.';
  if (location && location.length > 100) errors.location = 'Location must be 100 characters or fewer.';
  if (start_date && !DATE_RE.test(start_date)) errors.start_date = 'Please enter a valid date.';
  if (end_date && !DATE_RE.test(end_date)) errors.end_date = 'Please enter a valid date.';
  if (start_date && end_date && DATE_RE.test(start_date) && DATE_RE.test(end_date) && end_date < start_date) {
    errors.end_date = 'End date must be on or after the start date.';
  }

  const requirements = [];
  const reqErrors = [];
  const list = Array.isArray(body.requirements) ? body.requirements : [];
  list.forEach((r, i) => {
    const e = {};
    const req_type = String(r.req_type || '').toUpperCase();
    const name = String(r.name || '').trim();
    const min_value = r.min_value === undefined || r.min_value === null || r.min_value === '' ? null : String(r.min_value).trim();
    const weightage = Number(r.weightage);
    if (!REQ_TYPES.includes(req_type)) e.req_type = 'Choose a type.';
    if (!name) e.name = 'Name is required.';
    else if (name.length > 100) e.name = 'Max 100 characters.';
    if (min_value && min_value.length > 50) e.min_value = 'Max 50 characters.';
    if (!Number.isFinite(weightage) || weightage < 0 || weightage > 100) e.weightage = 'Weightage must be 0 to 100.';
    if (Object.keys(e).length) reqErrors[i] = e;
    requirements.push({
      req_type,
      name,
      min_value,
      is_mandatory: Boolean(r.is_mandatory),
      weightage: Math.round(weightage * 100) / 100,
    });
  });
  if (reqErrors.length) errors.requirements = reqErrors;

  return { errors, data: { title, description, location, department_id, start_date, end_date, requirements } };
}

const sameRequirements = (a, b) =>
  JSON.stringify(a.map(({ req_type, name, min_value, is_mandatory, weightage }) => [req_type, name, min_value || null, is_mandatory, Number(weightage)])) ===
  JSON.stringify(b.map(({ req_type, name, min_value, is_mandatory, weightage }) => [req_type, name, min_value || null, is_mandatory, Number(weightage)]));

async function insertRequirements(client, vacancyId, requirements) {
  for (const r of requirements) {
    await client.query(
      `INSERT INTO vacancy_requirement (vacancy_id, req_type, name, min_value, is_mandatory, weightage)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [vacancyId, r.req_type, r.name, r.min_value, r.is_mandatory, r.weightage]
    );
  }
}

// Generic Form Mechanism: one structured field per requirement
function fieldForRequirement(r) {
  switch (r.req_type) {
    case 'SKILL':
      return { label: `${r.name}: list your related skills and tools (comma separated)`, field_type: 'LIST' };
    case 'EXPERIENCE':
      return { label: `Years of experience in ${r.name}`, field_type: 'NUMBER' };
    case 'QUALIFICATION':
      return { label: `Your qualification relevant to: ${r.name}`, field_type: 'TEXT' };
    case 'CERTIFICATION':
      return { label: `${r.name} certification (name and year, or "None")`, field_type: 'TEXT' };
    default:
      return { label: r.name, field_type: 'TEXT' };
  }
}

const sendErrors = (res, errors) =>
  res.status(400).json({ message: 'Please correct the highlighted fields.', errors });

// ------------------------------------------------------------------ endpoints

// GET /api/vacancies?search=&department_id=&status=&page=1&limit=10
async function listVacancies(req, res) {
  const search = req.query.search ? String(req.query.search).trim() : null;
  const departmentId = toInt(req.query.department_id);
  const status = STATUSES.includes(String(req.query.status || '').toUpperCase()) ? String(req.query.status).toUpperCase() : null;
  const page = toInt(req.query.page) || 1;
  const limit = Math.min(toInt(req.query.limit) || 10, 50);

  try {
    const { rows } = await pool.query(
      `SELECT ${VACANCY_COLUMNS}, COUNT(*) OVER()::int AS total_count
         FROM vacancy v JOIN department d ON d.department_id = v.department_id
        WHERE ($1::text IS NULL OR v.title ILIKE '%' || $1 || '%' OR d.name ILIKE '%' || $1 || '%')
          AND ($2::int IS NULL OR v.department_id = $2)
          AND ($3::vacancy_status IS NULL OR v.status = $3)
        ORDER BY v.vacancy_id DESC
        LIMIT $4 OFFSET $5`,
      [search, departmentId, status, limit, (page - 1) * limit]
    );
    const total = rows[0]?.total_count || 0;
    return res.json({
      vacancies: rows.map(({ total_count, ...v }) => v),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) {
    console.error('listVacancies:', err);
    return res.status(500).json({ message: 'Unable to load vacancies. Please refresh.' });
  }
}

// GET /api/vacancies/stats  (HR dashboard numbers)
async function vacancyStats(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM vacancy WHERE status = 'OPEN') AS open_vacancies,
        (SELECT COUNT(*)::int FROM vacancy WHERE status = 'DRAFT') AS draft_vacancies,
        (SELECT COUNT(*)::int FROM vacancy
          WHERE status = 'OPEN' AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7) AS closing_this_week,
        (SELECT COUNT(*)::int FROM application WHERE submitted_at >= now() - interval '7 days') AS applications_this_week,
        (SELECT COUNT(*)::int FROM application a
          WHERE NOT EXISTS (SELECT 1 FROM ai_score s
                             WHERE s.application_id = a.application_id AND s.is_current AND s.eval_status = 'EVALUATED')
        ) AS pending_evaluation`);
    return res.json(rows[0]);
  } catch (err) {
    console.error('vacancyStats:', err);
    return res.status(500).json({ message: 'Unable to load dashboard numbers.' });
  }
}

// GET /api/vacancies/:id
async function getVacancy(req, res) {
  const id = toInt(req.params.id);
  if (!id) return res.status(404).json({ message: 'Vacancy not found.' });
  try {
    const vacancy = await fullVacancy(pool, id);
    if (!vacancy) return res.status(404).json({ message: 'Vacancy not found.' });
    return res.json({ vacancy });
  } catch (err) {
    console.error('getVacancy:', err);
    return res.status(500).json({ message: 'Unable to load the vacancy. Please refresh.' });
  }
}

// POST /api/vacancies   -> saved as DRAFT
async function createVacancy(req, res) {
  const { errors, data } = validateVacancyBody(req.body);
  if (Object.keys(errors).length) return sendErrors(res, errors);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO vacancy (department_id, created_by, title, description, location, status, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6, $7)
       RETURNING vacancy_id`,
      [data.department_id, req.user.user_id, data.title, data.description, data.location, data.start_date, data.end_date]
    );
    const vacancyId = rows[0].vacancy_id;
    await insertRequirements(client, vacancyId, data.requirements);
    await logAudit(client, req.user.user_id, 'vacancy', vacancyId, 'CREATE', data.title);
    await client.query('COMMIT');

    return res.status(201).json({ message: 'Vacancy saved as draft.', vacancy: await fullVacancy(pool, vacancyId) });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23503') return sendErrors(res, { department_id: 'Please select a valid department.' });
    console.error('createVacancy:', err);
    return res.status(500).json({ message: UNAVAILABLE });
  } finally {
    client.release();
  }
}

// PUT /api/vacancies/:id
// Details + dates can always be edited (except CLOSED/FILLED).
// Requirements can only change while the vacancy has NO applications
// (existing answers are linked to the current form).
async function updateVacancy(req, res) {
  const id = toInt(req.params.id);
  if (!id) return res.status(404).json({ message: 'Vacancy not found.' });

  const { errors, data } = validateVacancyBody(req.body);
  if (Object.keys(errors).length) return sendErrors(res, errors);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await loadVacancy(client, id);
    if (!current) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Vacancy not found.' });
    }
    if (['CLOSED', 'FILLED'].includes(current.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'A closed vacancy cannot be edited.' });
    }

    const oldReqs = await loadRequirements(client, id);
    const requirementsChanged = !sameRequirements(oldReqs, data.requirements);
    let newStatus = current.status;
    let note = 'Vacancy updated.';

    if (requirementsChanged) {
      if (current.applicants > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          message: 'This vacancy already has applications, so its requirements and form cannot be changed. You can still edit the details and dates.',
          code: 'REQUIREMENTS_LOCKED',
        });
      }
      // Old form was built from the old requirements -> remove it and rebuild later
      await client.query('DELETE FROM form_field WHERE vacancy_id = $1', [id]);
      await client.query('DELETE FROM vacancy_requirement WHERE vacancy_id = $1', [id]);
      await insertRequirements(client, id, data.requirements);
      if (current.status === 'OPEN') newStatus = 'DRAFT';
      note = current.status === 'OPEN'
        ? 'Requirements changed: the vacancy is back in Draft. Generate the form again and publish.'
        : 'Requirements changed: generate the application form again.';
    }

    await client.query(
      `UPDATE vacancy
          SET department_id = $1, title = $2, description = $3, location = $4,
              start_date = $5, end_date = $6, status = $7
        WHERE vacancy_id = $8`,
      [data.department_id, data.title, data.description, data.location, data.start_date, data.end_date, newStatus, id]
    );
    await logAudit(client, req.user.user_id, 'vacancy', id, 'UPDATE', requirementsChanged ? 'requirements changed' : null);
    await client.query('COMMIT');

    return res.json({ message: note, vacancy: await fullVacancy(pool, id) });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23503') return sendErrors(res, { department_id: 'Please select a valid department.' });
    console.error('updateVacancy:', err);
    return res.status(500).json({ message: UNAVAILABLE });
  } finally {
    client.release();
  }
}

// POST /api/vacancies/:id/generate-form
// Builds one field per requirement (replaces the current form).
async function generateForm(req, res) {
  const id = toInt(req.params.id);
  if (!id) return res.status(404).json({ message: 'Vacancy not found.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const vacancy = await loadVacancy(client, id);
    if (!vacancy) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Vacancy not found.' });
    }
    if (vacancy.applicants > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'This vacancy already has applications, so its form cannot be regenerated.' });
    }
    const requirements = await loadRequirements(client, id);
    if (!requirements.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Add at least one requirement before generating the form.' });
    }
    const total = requirements.reduce((s, r) => s + r.weightage, 0);
    if (Math.abs(total - 100) > 0.01) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Total weightage must equal 100%' });
    }

    await client.query('DELETE FROM form_field WHERE vacancy_id = $1', [id]);
    let order = 1;
    for (const r of requirements) {
      const f = fieldForRequirement(r);
      await client.query(
        `INSERT INTO form_field (vacancy_id, requirement_id, label, field_type, is_required, display_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, r.requirement_id, f.label.slice(0, 150), f.field_type, r.is_mandatory, order++]
      );
    }
    await logAudit(client, req.user.user_id, 'vacancy', id, 'GENERATE_FORM', `${requirements.length} fields`);
    await client.query('COMMIT');

    return res.json({ message: 'Form generated. Review the preview, adjust it if needed, then publish.', vacancy: await fullVacancy(pool, id) });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('generateForm:', err);
    return res.status(500).json({ message: UNAVAILABLE });
  } finally {
    client.release();
  }
}

// PUT /api/vacancies/:id/form
// Body: { fields: [{ requirement_id|null, label, field_type, is_required }] }  (array order = display order)
// HR adjusts the generated form: edit labels/types, required flag, order, add own questions.
async function saveForm(req, res) {
  const id = toInt(req.params.id);
  if (!id) return res.status(404).json({ message: 'Vacancy not found.' });

  const fields = Array.isArray(req.body?.fields) ? req.body.fields : null;
  if (!fields || !fields.length) return res.status(400).json({ message: 'The form must have at least one field.' });

  const fieldErrors = [];
  const clean = fields.map((f, i) => {
    const e = {};
    const label = String(f.label || '').trim();
    const field_type = String(f.field_type || '').toUpperCase();
    if (!label) e.label = 'Question text is required.';
    else if (label.length > 150) e.label = 'Max 150 characters.';
    if (!FIELD_TYPES.includes(field_type)) e.field_type = 'Choose a field type.';
    if (Object.keys(e).length) fieldErrors[i] = e;
    return { requirement_id: toInt(f.requirement_id), label, field_type, is_required: Boolean(f.is_required) };
  });
  if (fieldErrors.length) return sendErrors(res, { fields: fieldErrors });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const vacancy = await loadVacancy(client, id);
    if (!vacancy) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Vacancy not found.' });
    }
    if (vacancy.applicants > 0 || ['CLOSED', 'FILLED'].includes(vacancy.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'This form can no longer be changed.' });
    }

    // Requirement links must belong to this vacancy, and every requirement must keep one field
    const reqIds = new Set((await loadRequirements(client, id)).map((r) => r.requirement_id));
    const linked = new Set();
    for (const f of clean) {
      if (f.requirement_id && !reqIds.has(f.requirement_id)) f.requirement_id = null;
      if (f.requirement_id) {
        if (linked.has(f.requirement_id)) f.requirement_id = null; // only one field per requirement
        else linked.add(f.requirement_id);
      }
    }
    if (linked.size !== reqIds.size) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Every requirement needs its question in the form. Generate the form again if one was removed.' });
    }

    await client.query('DELETE FROM form_field WHERE vacancy_id = $1', [id]);
    let order = 1;
    for (const f of clean) {
      await client.query(
        `INSERT INTO form_field (vacancy_id, requirement_id, label, field_type, is_required, display_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, f.requirement_id, f.label, f.field_type, f.is_required, order++]
      );
    }
    await logAudit(client, req.user.user_id, 'vacancy', id, 'SAVE_FORM', `${clean.length} fields`);
    await client.query('COMMIT');
    return res.json({ message: 'Form saved.', vacancy: await fullVacancy(pool, id) });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('saveForm:', err);
    return res.status(500).json({ message: UNAVAILABLE });
  } finally {
    client.release();
  }
}

// POST /api/vacancies/:id/publish   DRAFT -> OPEN (shows on candidate portal)
async function publishVacancy(req, res) {
  const id = toInt(req.params.id);
  if (!id) return res.status(404).json({ message: 'Vacancy not found.' });
  try {
    const vacancy = await fullVacancy(pool, id);
    if (!vacancy) return res.status(404).json({ message: 'Vacancy not found.' });
    if (vacancy.status === 'OPEN') return res.status(409).json({ message: 'This vacancy is already published.' });
    if (vacancy.status !== 'DRAFT') return res.status(409).json({ message: 'A closed vacancy cannot be published again.' });

    const problems = [];
    if (!vacancy.title) problems.push('Title is required');
    if (!vacancy.start_date || !vacancy.end_date) problems.push('Start date and end date are required.');
    const today = new Date().toISOString().slice(0, 10);
    if (vacancy.end_date && vacancy.end_date < today) problems.push('End date is in the past.');
    if (!vacancy.requirements.length) problems.push('Add at least one requirement.');
    if (Math.abs(vacancy.total_weightage - 100) > 0.01) problems.push('Total weightage must equal 100%');
    if (!vacancy.form_fields.length) problems.push('Generate the application form first.');
    if (problems.length) return res.status(400).json({ message: problems.join(' '), problems });

    await pool.query(`UPDATE vacancy SET status = 'OPEN', published_at = now(), closed_at = NULL WHERE vacancy_id = $1`, [id]);
    await logAudit(pool, req.user.user_id, 'vacancy', id, 'PUBLISH', vacancy.title);
    return res.json({ message: 'Vacancy published. Candidates can now apply.', vacancy: await fullVacancy(pool, id) });
  } catch (err) {
    console.error('publishVacancy:', err);
    return res.status(500).json({ message: UNAVAILABLE });
  }
}

// POST /api/vacancies/:id/close   OPEN/DRAFT -> CLOSED (no new applications)
async function closeVacancy(req, res) {
  const id = toInt(req.params.id);
  if (!id) return res.status(404).json({ message: 'Vacancy not found.' });
  try {
    const { rows } = await pool.query(
      `UPDATE vacancy SET status = 'CLOSED', closed_at = now()
        WHERE vacancy_id = $1 AND status IN ('OPEN', 'DRAFT')
        RETURNING title`,
      [id]
    );
    if (!rows.length) return res.status(409).json({ message: 'This vacancy is already closed or does not exist.' });
    await logAudit(pool, req.user.user_id, 'vacancy', id, 'CLOSE', rows[0].title);
    return res.json({ message: 'Vacancy closed. No new applications will be accepted.', vacancy: await fullVacancy(pool, id) });
  } catch (err) {
    console.error('closeVacancy:', err);
    return res.status(500).json({ message: UNAVAILABLE });
  }
}

// DELETE /api/vacancies/:id   only when nobody has applied (otherwise: close it)
async function deleteVacancy(req, res) {
  const id = toInt(req.params.id);
  if (!id) return res.status(404).json({ message: 'Vacancy not found.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const vacancy = await loadVacancy(client, id);
    if (!vacancy) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Vacancy not found.' });
    }
    if ((await countApplications(client, id)) > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'This vacancy has applications and cannot be deleted. Close it instead.', code: 'HAS_APPLICATIONS' });
    }
    // requirements, form fields, questions, slots and postings are removed by ON DELETE CASCADE
    await client.query('DELETE FROM vacancy WHERE vacancy_id = $1', [id]);
    await logAudit(client, req.user.user_id, 'vacancy', id, 'DELETE', vacancy.title);
    await client.query('COMMIT');
    return res.json({ message: 'Vacancy deleted.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23503') {
      return res.status(409).json({ message: 'This vacancy has applications and cannot be deleted. Close it instead.' });
    }
    console.error('deleteVacancy:', err);
    return res.status(500).json({ message: 'Vacancy could not be deleted. Please try again.' });
  } finally {
    client.release();
  }
}

module.exports = {
  listVacancies,
  vacancyStats,
  getVacancy,
  createVacancy,
  updateVacancy,
  generateForm,
  saveForm,
  publishVacancy,
  closeVacancy,
  deleteVacancy,
  // exported for tests
  _private: { validateVacancyBody, sameRequirements, fieldForRequirement },
};
