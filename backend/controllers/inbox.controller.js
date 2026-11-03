// backend/controllers/inbox.controller.js
// Owner: Shivani
// SRS 4.4 Application Inbox (HR Admin only):
//   REQ-24 all applications per vacancy in one inbox
//   REQ-25 filter by vacancy, date, score, match tag; search by candidate name
//   REQ-26 pagination
//   REQ-27 full details of one application incl. portfolio link
//   REQ-28 applications without an AI score are marked "Pending evaluation"
const { pool } = require('../config/db');

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

    const [answers, history, score, flags] = await Promise.all([
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
    });
  } catch (err) {
    console.error('getApplication:', err);
    return res.status(500).json({ message: 'Unable to load the application. Please refresh.' });
  }
}

module.exports = { listInbox, inboxVacancies, getApplication };
