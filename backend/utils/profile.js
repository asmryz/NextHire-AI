
// Profile completeness: a candidate can apply only when the profile is 100% complete.
// Used by candidate.controller.js (profile page, vacancy page) and application.controller.js (apply).
const PROFILE_FIELDS = [
  { key: 'full_name', label: 'Full name' },
  { key: 'phone', label: 'Phone number' },
  { key: 'gender', label: 'Gender' },
  { key: 'city', label: 'City' },
  { key: 'address', label: 'Address' },
  { key: 'highest_qualification', label: 'Highest qualification' },
  { key: 'profile_picture_url', label: 'Profile picture' },
];


function profileStatus(p = {}) {
  const missing = PROFILE_FIELDS.filter(({ key }) => {
    const v = p[key];
    if (key === 'gender') return !v || v === 'NOT_SPECIFIED';
    return !v || !String(v).trim();
  }).map((f) => f.label);
  const completeness = Math.round(((PROFILE_FIELDS.length - missing.length) / PROFILE_FIELDS.length) * 100);
  return { completeness, missing };
}

// Loads the candidate's profile row and returns its status. `db` = pool or a transaction client.
async function getProfileStatus(db, userId) {
  const { rows } = await db.query(
    `SELECT u.full_name, u.profile_picture_url, p.phone, p.gender, p.city, p.address, p.highest_qualification
       FROM users u LEFT JOIN candidate_profile p ON p.user_id = u.user_id
      WHERE u.user_id = $1`,
    [userId]
  );
  return profileStatus(rows[0] || {});
}

const PROFILE_INCOMPLETE_MESSAGE = 'Please complete your profile (100%) before applying.';

module.exports = { PROFILE_FIELDS, profileStatus, getProfileStatus, PROFILE_INCOMPLETE_MESSAGE };
