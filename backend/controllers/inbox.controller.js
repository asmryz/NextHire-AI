// backend/controllers/inbox.controller.js
// Owner: Shivani
// SRS 4.4 Application Inbox (HR Admin only):
//   REQ-24 all applications per vacancy in one inbox
//   REQ-25 filter by vacancy, date, score, match tag; search by candidate name
//   REQ-26 pagination
//   REQ-27 full details of one application incl. portfolio link
//   REQ-28 applications without an AI score are marked "Pending evaluation"
// Also: HR dashboard analytics, employee referral details, application audit log.
const { pool } = require('../config/db');
const { logAudit } = require('../utils/audit');
const v = require('../utils/validators');

const STAGES = ['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];
const TAGS = ['STRONG', 'POSSIBLE', 'NOT_A_FIT', 'PENDING'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const toInt = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const toScore = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
};
const formatCnic = (c) => (c && c.length === 13 ? `${c.slice(0, 5)}-${c.slice(5, 12)}-${c.slice(12)}` : c);

// The current AI score of each application (latest version marked current)
const CURRENT_SCORE = `
  LEFT JOIN ai_score s
         ON s.application_id = a.application_id AND s.is_current AND s.eval_status = 'EVALUATED'`;

// GET /api/inbox?vacancy_id=&from=&to=&min_score=&max_score=&tag=&stage=&search=&sort=&page=&limit=
async function listInbox(req, res) {
  const q = req.query;
  const vacancyId = toInt(q.vacancy_id);
  const from = DATE_RE.test(q.from || '') ? q.from : null;
  const to = DATE_RE.test(q.to || '') ? q.to : null;
  const minScore = toScore(q.min_score);
  const maxScore = toScore(q.max_score);
  const tag = TAGS.includes(String(q.tag || '').toUpperCase()) ? String(q.tag).toUpperCase() : null;
  const stage = STAGES.includes(String(q.stage || '').toUpperCase()) ? String(q.stage).toUpperCase() : null;
  const search = q.search ? String(q.search).trim() : null;
  const sortByScore = q.sort === 'score';
  const page = toInt(q.page) || 1;
  const limit = Math.min(toInt(q.limit) || 15, 50);

  try {
    const { rows } = await pool.query(
      `SELECT a.application_id, a.stage, a.is_active, a.submitted_at,
              u.user_id AS candidate_id, u.full_name AS candidate_name, u.email AS candidate_email,
              u.profile_picture_url,
              v.vacancy_id, v.title AS vacancy_title, d.name AS department,
              s.fulfilment_pct::float AS score, s.rank_no,
              COALESCE(s.final_match_tag, s.ai_match_tag) AS match_tag,
              (s.score_id IS NULL) AS pending_evaluation,
              EXISTS (SELECT 1 FROM duplicate_flag f
                       WHERE f.status = 'OPEN'
                         AND (f.application_id = a.application_id OR f.matched_application_id = a.application_id)) AS possible_duplicate,
              COUNT(*) OVER()::int AS total_count
         FROM application a
         JOIN users u      ON u.user_id = a.candidate_id
         JOIN vacancy v    ON v.vacancy_id = a.vacancy_id
         JOIN department d ON d.department_id = v.department_id
         ${CURRENT_SCORE}
        WHERE ($1::int  IS NULL OR a.vacancy_id = $1)
          AND ($2::date IS NULL OR a.submitted_at >= $2::date)
          AND ($3::date IS NULL OR a.submitted_at <  $3::date + 1)
          AND ($4::numeric IS NULL OR s.fulfilment_pct >= $4)
          AND ($5::numeric IS NULL OR s.fulfilment_pct <= $5)
          AND ($6::text IS NULL
               OR ($6 = 'PENDING' AND s.score_id IS NULL)
               OR COALESCE(s.final_match_tag, s.ai_match_tag)::text = $6)
          AND ($7::application_stage IS NULL OR a.stage = $7)
          AND ($8::text IS NULL OR u.full_name ILIKE '%' || $8 || '%')
        ORDER BY ${sortByScore ? 's.fulfilment_pct DESC NULLS LAST, a.submitted_at DESC' : 'a.submitted_at DESC'}
        LIMIT $9 OFFSET $10`,
      [vacancyId, from, to, minScore, maxScore, tag, stage, search, limit, (page - 1) * limit]
    );
    const total = rows[0]?.total_count || 0;
    return res.json({
      applications: rows.map(({ total_count, ...r }) => r),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) {
    console.error('listInbox:', err);
    return res.status(500).json({ message: 'Unable to load applications. Please refresh.' });
  }
}

// GET /api/inbox/vacancies   (for the vacancy filter dropdown)
async function inboxVacancies(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT v.vacancy_id, v.title, v.status,
              (SELECT COUNT(*)::int FROM application a WHERE a.vacancy_id = v.vacancy_id) AS applicants
         FROM vacancy v
        WHERE v.status <> 'DRAFT'
        ORDER BY v.status = 'OPEN' DESC, v.title`
    );
    return res.json({ vacancies: rows });
  } catch (err) {
    console.error('inboxVacancies:', err);
    return res.status(500).json({ message: 'Unable to load vacancies.' });
  }
}

// GET /api/inbox/:id   full application (REQ-27)
async function getApplication(req, res) {
  const id = toInt(req.params.id);
  if (!id) return res.status(404).json({ message: 'Application not found.' });
  try {
    const { rows } = await pool.query(
      `SELECT a.application_id, a.stage, a.review_decision, a.is_active, a.submitted_at, a.updated_at, a.portfolio_link,
              v.vacancy_id, v.title AS vacancy_title, v.status AS vacancy_status, d.name AS department,
              u.user_id AS candidate_id, u.full_name, u.email, u.profile_picture_url,
              p.cnic, p.phone, p.city, p.address, p.highest_qualification
         FROM application a
         JOIN vacancy v    ON v.vacancy_id = a.vacancy_id
         JOIN department d ON d.department_id = v.department_id
         JOIN users u      ON u.user_id = a.candidate_id
         LEFT JOIN candidate_profile p ON p.user_id = u.user_id
        WHERE a.application_id = $1`,
      [id]
    );
    const app = rows[0];
    if (!app) return res.status(404).json({ message: 'Application not found.' });
    app.cnic = formatCnic(app.cnic);

    const [answers, history, score, flags, referral, audit] = await Promise.all([
      pool.query(
        `SELECT f.field_id, f.label, f.field_type, f.is_required, f.section, f.field_key, ans.answer_value,
                r.requirement_id, r.req_type, r.name AS requirement_name, r.min_value, r.is_mandatory,
                r.weightage::float AS weightage
           FROM form_field f
           LEFT JOIN application_answer ans ON ans.field_id = f.field_id AND ans.application_id = $1
           LEFT JOIN vacancy_requirement r  ON r.requirement_id = f.requirement_id
          WHERE f.vacancy_id = $2
          ORDER BY f.display_order, f.field_id`,
        [id, app.vacancy_id]
      ),
      pool.query(
        `SELECT h.from_stage, h.to_stage, h.changed_at, u.full_name AS changed_by
           FROM stage_history h LEFT JOIN users u ON u.user_id = h.changed_by
          WHERE h.application_id = $1 ORDER BY h.changed_at, h.history_id`,
        [id]
      ),
      pool.query(
        `SELECT s.score_id, s.version, s.fulfilment_pct::float AS fulfilment_pct, s.rank_no,
                s.ai_match_tag, s.final_match_tag, s.eval_status, s.evaluated_at
           FROM ai_score s WHERE s.application_id = $1 AND s.is_current`,
        [id]
      ),
      pool.query(
        `SELECT f.flag_id, f.match_reason, f.similarity::float AS similarity, f.status,
                CASE WHEN f.application_id = $1 THEN f.matched_application_id ELSE f.application_id END AS other_application_id
           FROM duplicate_flag f
          WHERE f.status = 'OPEN' AND (f.application_id = $1 OR f.matched_application_id = $1)`,
        [id]
      ),
      pool.query(
        `SELECT r.employee_name, r.employee_email, r.employee_phone, r.employee_department, r.employee_position,
                r.created_at, r.updated_at, u.full_name AS marked_by
           FROM referral r LEFT JOIN users u ON u.user_id = r.marked_by
          WHERE r.application_id = $1`,
        [id]
      ),
      pool.query(
        `SELECT l.action, l.details, l.created_at, u.full_name AS by_name, u.role AS by_role
           FROM audit_log l LEFT JOIN users u ON u.user_id = l.user_id
          WHERE l.entity_type = 'application' AND l.entity_id = $1
          ORDER BY l.created_at DESC, l.log_id DESC`,
        [id]
      ),
    ]);

    let breakdown = [];
    const current = score.rows[0] || null;
    if (current) {
      const det = await pool.query(
        `SELECT r.name, r.req_type, r.is_mandatory, r.weightage::float AS weightage,
                sd.is_met, sd.matched_value, sd.weight_awarded::float AS weight_awarded
           FROM score_detail sd JOIN vacancy_requirement r ON r.requirement_id = sd.requirement_id
          WHERE sd.score_id = $1 ORDER BY r.is_mandatory DESC, r.requirement_id`,
        [current.score_id]
      );
      breakdown = det.rows;
    }

    return res.json({
      application: app,
      answers: answers.rows,
      history: history.rows,
      score: current && current.eval_status === 'EVALUATED' ? current : null,
      score_breakdown: breakdown,
      duplicate_flags: flags.rows,
      referral: referral.rows[0] || null,
      audit_log: audit.rows,
    });
  } catch (err) {
    console.error('getApplication:', err);
    return res.status(500).json({ message: 'Unable to load the application. Please refresh.' });
  }
}

// ================================================================ REFERRAL
// HR marks an application as referred by an employee and saves who referred the candidate.

function validateReferral(b = {}) {
  const clean = {
    employee_name: String(b.employee_name || '').trim(),
    employee_email: String(b.employee_email || '').trim().toLowerCase(),
    employee_phone: String(b.employee_phone || '').replace(/[\s-]/g, ''),
    employee_department: String(b.employee_department || '').trim(),
    employee_position: String(b.employee_position || '').trim(),
  };
  const e = {};
  if (!clean.employee_name) e.employee_name = v.MESSAGES.required;
  else if (clean.employee_name.length > 100) e.employee_name = 'Max 100 characters.';
  if (!clean.employee_email) e.employee_email = v.MESSAGES.required;
  else if (!v.isEmail(clean.employee_email) || clean.employee_email.length > 255) e.employee_email = v.MESSAGES.email;
  if (!clean.employee_phone) e.employee_phone = v.MESSAGES.required;
  else if (!v.isPhone(clean.employee_phone)) e.employee_phone = v.MESSAGES.phone;
  if (!clean.employee_department) e.employee_department = v.MESSAGES.required;
  else if (clean.employee_department.length > 100) e.employee_department = 'Max 100 characters.';
  if (!clean.employee_position) e.employee_position = v.MESSAGES.required;
  else if (clean.employee_position.length > 100) e.employee_position = 'Max 100 characters.';
  return { clean, errors: e };
}

// PUT /api/inbox/:id/referral   Body: employee_name, employee_email, employee_phone, employee_department, employee_position
async function saveReferral(req, res) {
  const id = toInt(req.params.id);
  if (!id) return res.status(404).json({ message: 'Application not found.' });
  const { clean, errors } = validateReferral(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });

  try {
    const exists = await pool.query('SELECT 1 FROM application WHERE application_id = $1', [id]);
    if (!exists.rowCount) return res.status(404).json({ message: 'Application not found.' });

    const { rows } = await pool.query(
      `INSERT INTO referral (application_id, marked_by, employee_name, employee_email, employee_phone,
                             employee_department, employee_position)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (application_id) DO UPDATE
          SET marked_by = EXCLUDED.marked_by, employee_name = EXCLUDED.employee_name,
              employee_email = EXCLUDED.employee_email, employee_phone = EXCLUDED.employee_phone,
              employee_department = EXCLUDED.employee_department, employee_position = EXCLUDED.employee_position,
              updated_at = now()
       RETURNING (xmax = 0) AS created`,
      [id, req.user.user_id, clean.employee_name, clean.employee_email, clean.employee_phone,
       clean.employee_department, clean.employee_position]
    );
    const created = rows[0].created;
    await logAudit(pool, req.user.user_id, 'application', id, created ? 'REFERRAL_ADDED' : 'REFERRAL_UPDATED',
      `Referred by ${clean.employee_name} (${clean.employee_position}, ${clean.employee_department})`);
    return res.json({ message: created ? 'Referral saved.' : 'Referral updated.' });
  } catch (err) {
    console.error('saveReferral:', err);
    return res.status(500).json({ message: 'Unable to save the referral. Please try again.' });
  }
}

// DELETE /api/inbox/:id/referral
async function removeReferral(req, res) {
  const id = toInt(req.params.id);
  if (!id) return res.status(404).json({ message: 'Application not found.' });
  try {
    const { rows } = await pool.query('DELETE FROM referral WHERE application_id = $1 RETURNING employee_name', [id]);
    if (!rows.length) return res.status(404).json({ message: 'This application is not marked as referred.' });
    await logAudit(pool, req.user.user_id, 'application', id, 'REFERRAL_REMOVED', `Removed referral by ${rows[0].employee_name}`);
    return res.json({ message: 'Referral removed.' });
  } catch (err) {
    console.error('removeReferral:', err);
    return res.status(500).json({ message: 'Unable to remove the referral. Please try again.' });
  }
}

// ================================================================ ANALYTICS
// GET /api/inbox/analytics   everything the HR dashboard shows, in one call
async function analytics(req, res) {
  try {
    const [kpi, trend, stages, tags, departments, vacancies, recent] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM application) AS total_applications,
          (SELECT COUNT(*)::int FROM application WHERE submitted_at >= now() - interval '7 days') AS this_week,
          (SELECT COUNT(*)::int FROM application
            WHERE submitted_at >= now() - interval '14 days' AND submitted_at < now() - interval '7 days') AS last_week,
          (SELECT COUNT(*)::int FROM vacancy WHERE status = 'OPEN') AS open_vacancies,
          (SELECT COUNT(*)::int FROM vacancy WHERE status = 'DRAFT') AS draft_vacancies,
          (SELECT COUNT(*)::int FROM vacancy
            WHERE status = 'OPEN' AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7) AS closing_this_week,
          (SELECT COUNT(*)::int FROM application a WHERE a.is_active AND NOT EXISTS (
             SELECT 1 FROM ai_score s WHERE s.application_id = a.application_id AND s.is_current AND s.eval_status = 'EVALUATED'))
            AS pending_evaluation,
          (SELECT ROUND(AVG(s.fulfilment_pct))::int FROM ai_score s
             JOIN application a ON a.application_id = s.application_id
            WHERE a.is_active AND s.is_current AND s.eval_status = 'EVALUATED') AS avg_score,
          (SELECT COUNT(*)::int FROM referral) AS referrals`),
      pool.query(`
        -- last 14 days, counted in Pakistan time
        SELECT to_char(d.day, 'YYYY-MM-DD') AS day, COUNT(a.application_id)::int AS count
          FROM generate_series((now() AT TIME ZONE 'Asia/Karachi')::date - 13,
                               (now() AT TIME ZONE 'Asia/Karachi')::date, interval '1 day') AS d(day)
          LEFT JOIN application a ON (a.submitted_at AT TIME ZONE 'Asia/Karachi')::date = d.day::date
         GROUP BY d.day ORDER BY d.day`),
      pool.query(`SELECT stage::text AS stage, COUNT(*)::int AS count FROM application GROUP BY stage`),
      pool.query(`
        SELECT COALESCE(COALESCE(s.final_match_tag, s.ai_match_tag)::text, 'PENDING') AS tag, COUNT(*)::int AS count
          FROM application a
          ${CURRENT_SCORE}
         WHERE a.is_active
         GROUP BY 1`),
      pool.query(`
        SELECT d.name AS department, COUNT(a.application_id)::int AS count
          FROM application a
          JOIN vacancy v ON v.vacancy_id = a.vacancy_id
          JOIN department d ON d.department_id = v.department_id
         GROUP BY d.name ORDER BY count DESC, d.name LIMIT 6`),
      pool.query(`
        SELECT v.vacancy_id, v.title, v.end_date, d.name AS department,
               COUNT(a.application_id)::int AS applicants,
               COUNT(*) FILTER (WHERE COALESCE(s.final_match_tag, s.ai_match_tag) = 'STRONG')::int AS strong,
               ROUND(AVG(s.fulfilment_pct))::int AS avg_score
          FROM vacancy v
          JOIN department d ON d.department_id = v.department_id
          LEFT JOIN application a ON a.vacancy_id = v.vacancy_id
          ${CURRENT_SCORE}
         WHERE v.status = 'OPEN'
         GROUP BY v.vacancy_id, d.name
         ORDER BY applicants DESC, v.end_date NULLS LAST
         LIMIT 5`),
      pool.query(`
        SELECT a.application_id, a.submitted_at, a.stage, u.full_name AS candidate_name, u.profile_picture_url,
               v.title AS vacancy_title, s.fulfilment_pct::float AS score,
               COALESCE(s.final_match_tag, s.ai_match_tag) AS match_tag
          FROM application a
          JOIN users u ON u.user_id = a.candidate_id
          JOIN vacancy v ON v.vacancy_id = a.vacancy_id
          ${CURRENT_SCORE}
         ORDER BY a.submitted_at DESC
         LIMIT 6`),
    ]);

    const stageCount = Object.fromEntries(stages.rows.map((r) => [r.stage, r.count]));
    const tagCount = Object.fromEntries(tags.rows.map((r) => [r.tag, r.count]));
    return res.json({
      kpi: kpi.rows[0],
      trend: trend.rows,
      pipeline: STAGES.map((stage) => ({ stage, count: stageCount[stage] || 0 })),
      match_tags: TAGS.map((tag) => ({ tag, count: tagCount[tag] || 0 })),
      departments: departments.rows,
      top_vacancies: vacancies.rows,
      recent: recent.rows,
    });
  } catch (err) {
    console.error('analytics:', err);
    return res.status(500).json({ message: 'Unable to load dashboard analytics. Please refresh.' });
  }
}

module.exports = { listInbox, inboxVacancies, getApplication, saveReferral, removeReferral, analytics };
