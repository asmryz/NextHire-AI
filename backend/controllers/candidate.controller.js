// backend/controllers/candidate.controller.js
// Owner: Shivani
// SRS 4.3 Candidate Portal:
//   REQ-16 view / edit personal and contact details (+ profile picture)
//   REQ-17 list open vacancies, search by title or department
//   REQ-18 full description and requirements of a selected vacancy
//   BR-12 one application per vacancy, only while open, one active application at a time
const { pool } = require('../config/db');
const { uploadProfilePicture, deleteImage } = require('../utils/cloudinary');
const { isPhone, cleanPhone } = require('../utils/validators');

const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'NOT_SPECIFIED'];
const toInt = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};
// 4210112345671 -> 42101-1234567-1
const formatCnic = (c) => (c && c.length === 13 ? `${c.slice(0, 5)}-${c.slice(5, 12)}-${c.slice(12)}` : c);

// ================================================================ PROFILE

async function loadProfile(userId) {
  const { rows } = await pool.query(
    `SELECT u.user_id, u.full_name, u.email, u.profile_picture_url,
            p.cnic, p.phone, p.address, p.city, p.gender, p.highest_qualification, p.updated_at
       FROM users u
       LEFT JOIN candidate_profile p ON p.user_id = u.user_id
      WHERE u.user_id = $1`,
    [userId]
  );
  const p = rows[0];
  if (!p) return null;
  const fields = [p.full_name, p.phone, p.address, p.city, p.highest_qualification, p.profile_picture_url];
  return {
    ...p,
    cnic: formatCnic(p.cnic),
    gender: p.gender || 'NOT_SPECIFIED',
    completeness: Math.round((fields.filter(Boolean).length / fields.length) * 100),
  };
}

// GET /api/candidate/profile
async function getProfile(req, res) {
  try {
    const profile = await loadProfile(req.user.user_id);
    if (!profile) return res.status(404).json({ message: 'Profile not found.' });
    return res.json({ profile });
  } catch (err) {
    console.error('getProfile:', err);
    return res.status(500).json({ message: 'Unable to load your profile. Please refresh.' });
  }
}

// PUT /api/candidate/profile
// Body: full_name, phone, address, city, gender, highest_qualification
// (Email and CNIC are identity fields and cannot be changed here.)
async function updateProfile(req, res) {
  const b = req.body || {};
  const errors = {};
  const fullName = String(b.full_name || '').trim();
  const phone = String(b.phone || '').trim();
  const address = b.address ? String(b.address).trim() : null;
  const city = b.city ? String(b.city).trim() : null;
  const qualification = b.highest_qualification ? String(b.highest_qualification).trim() : null;
  const gender = GENDERS.includes(b.gender) ? b.gender : 'NOT_SPECIFIED';

  if (!fullName) errors.full_name = 'This field is required.';
  else if (fullName.length > 100) errors.full_name = 'Name must be 100 characters or fewer.';
  if (!phone) errors.phone = 'This field is required.';
  else if (!isPhone(phone)) errors.phone = 'Please enter a valid phone number.';
  if (address && address.length > 255) errors.address = 'Address must be 255 characters or fewer.';
  if (city && city.length > 60) errors.city = 'City must be 60 characters or fewer.';
  if (qualification && qualification.length > 100) errors.highest_qualification = 'Must be 100 characters or fewer.';
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET full_name = $1 WHERE user_id = $2', [fullName, req.user.user_id]);
    // Upsert: older accounts may not have a profile row yet
    await client.query(
      `INSERT INTO candidate_profile (user_id, phone, address, city, gender, highest_qualification, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (user_id) DO UPDATE
          SET phone = EXCLUDED.phone, address = EXCLUDED.address, city = EXCLUDED.city,
              gender = EXCLUDED.gender, highest_qualification = EXCLUDED.highest_qualification`,
      [req.user.user_id, cleanPhone(phone), address, city, gender, qualification]
    );
    await client.query('COMMIT');
    return res.json({ message: 'Profile saved.', profile: await loadProfile(req.user.user_id) });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('updateProfile:', err);
    return res.status(500).json({ message: 'Profile could not be saved. Please try again.' });
  } finally {
    client.release();
  }
}

// POST /api/candidate/profile/picture   (multipart form, field name "picture")
async function uploadPicture(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Please choose an image (JPG, PNG or WEBP, max 2 MB).' });
  try {
    const result = await uploadProfilePicture(req.file.buffer, req.user.user_id);
    // ?v= makes browsers show the new picture instead of the cached old one
    const url = `${result.secure_url}?v=${result.version}`;
    await pool.query(
      'UPDATE users SET profile_picture_url = $1, profile_picture_public_id = $2 WHERE user_id = $3',
      [url, result.public_id, req.user.user_id]
    );
    return res.json({ message: 'Profile picture updated.', profile_picture_url: url });
  } catch (err) {
    console.error('uploadPicture:', err.message || err);
    return res.status(500).json({ message: 'Picture could not be uploaded. Please try again.' });
  }
}

// DELETE /api/candidate/profile/picture
async function removePicture(req, res) {
  try {
    const { rows } = await pool.query('SELECT profile_picture_public_id FROM users WHERE user_id = $1', [req.user.user_id]);
    const publicId = rows[0]?.profile_picture_public_id;
    if (publicId) await deleteImage(publicId).catch((e) => console.error('cloudinary destroy:', e.message));
    await pool.query(
      'UPDATE users SET profile_picture_url = NULL, profile_picture_public_id = NULL WHERE user_id = $1',
      [req.user.user_id]
    );
    return res.json({ message: 'Profile picture removed.', profile_picture_url: null });
  } catch (err) {
    console.error('removePicture:', err);
    return res.status(500).json({ message: 'Picture could not be removed. Please try again.' });
  }
}

// ================================================================ VACANCIES

// The candidate's current active application, if any (BR-12)
async function findActiveApplication(userId) {
  const { rows } = await pool.query(
    `SELECT a.application_id, a.vacancy_id, a.stage, v.title
       FROM application a JOIN vacancy v ON v.vacancy_id = a.vacancy_id
      WHERE a.candidate_id = $1 AND a.is_active AND a.stage NOT IN ('HIRED', 'REJECTED')
      ORDER BY a.submitted_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

// A vacancy is "open for applications" when OPEN and today is inside start/end date
const OPEN_NOW = `v.status = 'OPEN'
  AND (v.start_date IS NULL OR v.start_date <= CURRENT_DATE)
  AND (v.end_date IS NULL OR v.end_date >= CURRENT_DATE)`;

// GET /api/candidate/vacancies?search=&department_id=&page=1&limit=9
async function listOpenVacancies(req, res) {
  const search = req.query.search ? String(req.query.search).trim() : null;
  const departmentId = toInt(req.query.department_id);
  const page = toInt(req.query.page) || 1;
  const limit = Math.min(toInt(req.query.limit) || 9, 30);

  try {
    const [list, active] = await Promise.all([
      pool.query(
        `SELECT v.vacancy_id, v.title, v.location, d.name AS department, v.department_id,
                LEFT(COALESCE(v.description, ''), 180) AS summary,
                to_char(v.start_date, 'YYYY-MM-DD') AS start_date,
                to_char(v.end_date, 'YYYY-MM-DD') AS end_date,
                EXISTS (SELECT 1 FROM application a
                         WHERE a.vacancy_id = v.vacancy_id AND a.candidate_id = $1) AS has_applied,
                COUNT(*) OVER()::int AS total_count
           FROM vacancy v JOIN department d ON d.department_id = v.department_id
          WHERE ${OPEN_NOW}
            AND ($2::text IS NULL OR v.title ILIKE '%' || $2 || '%' OR d.name ILIKE '%' || $2 || '%')
            AND ($3::int IS NULL OR v.department_id = $3)
          ORDER BY v.end_date NULLS LAST, v.vacancy_id DESC
          LIMIT $4 OFFSET $5`,
        [req.user.user_id, search, departmentId, limit, (page - 1) * limit]
      ),
      findActiveApplication(req.user.user_id),
    ]);

    const total = list.rows[0]?.total_count || 0;
    return res.json({
      vacancies: list.rows.map(({ total_count, ...v }) => v),
      active_application: active,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) {
    console.error('listOpenVacancies:', err);
    return res.status(500).json({ message: 'Unable to load vacancies. Please refresh.' });
  }
}

// GET /api/candidate/vacancies/:id
async function getOpenVacancy(req, res) {
  const id = toInt(req.params.id);
  if (!id) return res.status(404).json({ message: 'Vacancy not found.' });

  try {
    const { rows } = await pool.query(
      `SELECT v.vacancy_id, v.title, v.description, v.location, v.status, d.name AS department,
              to_char(v.start_date, 'YYYY-MM-DD') AS start_date,
              to_char(v.end_date, 'YYYY-MM-DD') AS end_date,
              (${OPEN_NOW}) AS is_open_now
         FROM vacancy v JOIN department d ON d.department_id = v.department_id
        WHERE v.vacancy_id = $1 AND v.status IN ('OPEN', 'CLOSED', 'FILLED')`,
      [id]
    );
    const vacancy = rows[0];
    if (!vacancy) return res.status(404).json({ message: 'Vacancy not found.' });

    const [reqs, fields, applied, active] = await Promise.all([
      // Weightage is internal to HR and is not shown to candidates
      pool.query(
        `SELECT requirement_id, req_type, name, min_value, is_mandatory
           FROM vacancy_requirement WHERE vacancy_id = $1 ORDER BY is_mandatory DESC, requirement_id`,
        [id]
      ),
      pool.query(
        `SELECT field_id, label, field_type, is_required, display_order
           FROM form_field WHERE vacancy_id = $1 ORDER BY display_order, field_id`,
        [id]
      ),
      pool.query(
        `SELECT application_id, stage, submitted_at FROM application
          WHERE vacancy_id = $1 AND candidate_id = $2`,
        [id, req.user.user_id]
      ),
      findActiveApplication(req.user.user_id),
    ]);

    const myApplication = applied.rows[0] || null;
    let canApply = true;
    let reason = null;
    if (myApplication) {
      canApply = false;
      reason = 'You have already applied for this vacancy.';
    } else if (!vacancy.is_open_now) {
      canApply = false;
      reason = 'This vacancy is no longer accepting applications.';
    } else if (active) {
      canApply = false;
      reason = 'You already have an active application. You can apply for another vacancy once it is closed.';
    }

    return res.json({
      vacancy: { ...vacancy, requirements: reqs.rows, form_fields: fields.rows },
      my_application: myApplication,
      can_apply: canApply,
      reason,
    });
  } catch (err) {
    console.error('getOpenVacancy:', err);
    return res.status(500).json({ message: 'Unable to load the vacancy. Please refresh.' });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  uploadPicture,
  removePicture,
  listOpenVacancies,
  getOpenVacancy,
  _private: { formatCnic },
};
