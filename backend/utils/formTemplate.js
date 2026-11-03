// backend/utils/formTemplate.js
// Owner: Aarian (used by Shivani's apply + inbox code too)
// Generic Form Mechanism: every vacancy form =
//   1. Standard sections every job needs (HR does not have to add them)
//   2. "Role requirements": questions built from the vacancy's own requirements
//   3. Closing note
// Change wording or options here and every newly generated form follows.

const FIELD_TYPES = ['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'LIST', 'URL', 'EMAIL', 'PHONE', 'RADIO', 'SELECT'];
const CHOICE_TYPES = ['RADIO', 'SELECT'];

const SECTIONS = {
  PERSONAL: 'Personal details',
  EDUCATION: 'Education',
  EXPERIENCE: 'Work experience',
  SKILLS: 'Skills',
  ROLE: 'Role requirements',
  CLOSING: 'Anything else',
};

const LEVELS = ['None', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];

// key, label, type, required, options, help
const STANDARD_FIELDS = [
  // ---- Personal (pre-filled from the candidate profile)
  { section: 'PERSONAL', field_key: 'full_name', label: 'Full name', field_type: 'TEXT', is_required: true },
  { section: 'PERSONAL', field_key: 'email', label: 'Email address', field_type: 'EMAIL', is_required: true },
  { section: 'PERSONAL', field_key: 'phone', label: 'Phone number', field_type: 'PHONE', is_required: true, help_text: 'e.g. 03001234567' },
  { section: 'PERSONAL', field_key: 'cnic', label: 'CNIC', field_type: 'TEXT', is_required: true, help_text: 'Format: XXXXX-XXXXXXX-X' },
  { section: 'PERSONAL', field_key: 'gender', label: 'Gender', field_type: 'RADIO', is_required: false,
    options: ['Male', 'Female', 'Prefer not to say'], help_text: 'Optional. Never used for scoring.' },
  { section: 'PERSONAL', field_key: 'city', label: 'Current city', field_type: 'TEXT', is_required: true },

  // ---- Education
  { section: 'EDUCATION', field_key: 'highest_qualification', label: 'Highest qualification', field_type: 'SELECT', is_required: true,
    options: ['Matric / O-Level', 'Intermediate / A-Level', 'Diploma', "Bachelor's", "Master's", 'MPhil / PhD'] },
  { section: 'EDUCATION', field_key: 'degree_field', label: 'Degree / field of study', field_type: 'TEXT', is_required: true,
    help_text: 'e.g. BS Computer Science' },
  { section: 'EDUCATION', field_key: 'institution', label: 'University / institute', field_type: 'TEXT', is_required: true },
  { section: 'EDUCATION', field_key: 'graduation_year', label: 'Year of graduation', field_type: 'NUMBER', is_required: true,
    help_text: 'Expected year if still studying' },

  // ---- Experience
  { section: 'EXPERIENCE', field_key: 'total_experience', label: 'Total work experience (years)', field_type: 'NUMBER', is_required: true,
    help_text: 'Write 0 if you are a fresh graduate' },
  { section: 'EXPERIENCE', field_key: 'current_title', label: 'Current or last job title', field_type: 'TEXT', is_required: false },
  { section: 'EXPERIENCE', field_key: 'current_employer', label: 'Current or last employer', field_type: 'TEXT', is_required: false },
  { section: 'EXPERIENCE', field_key: 'availability', label: 'When can you join?', field_type: 'SELECT', is_required: false,
    options: ['Immediately', 'Within 2 weeks', 'Within 1 month', 'More than 1 month'] },

  // ---- Skills
  { section: 'SKILLS', field_key: 'key_skills', label: 'Your key skills', field_type: 'LIST', is_required: true,
    help_text: 'Separate with commas, e.g. React, SQL, Communication' },
];

const CLOSING_FIELDS = [
  { section: 'CLOSING', field_key: 'cover_note', label: 'Why are you a good fit for this role?', field_type: 'TEXTAREA', is_required: false,
    help_text: 'Optional, a few lines.' },
];

// Personal details are NEVER sent to the AI (fair scoring, BR-3 / SRS 5.2)
const NOT_FOR_AI = ['full_name', 'email', 'phone', 'cnic', 'gender', 'city', 'cover_note'];

// Fields HR may not delete (needed for contact + duplicate detection)
const CORE_KEYS = ['full_name', 'email', 'phone', 'cnic'];

// Questions for one requirement (first one is the main answer used for matching)
function requirementFields(r) {
  const main = { section: 'ROLE', requirement_id: r.requirement_id, is_required: true };
  const extra = { section: 'ROLE', requirement_id: r.requirement_id, is_required: false };
  const min = r.min_value ? ` (minimum: ${r.min_value})` : '';
  switch (r.req_type) {
    case 'SKILL':
      return [
        { ...main, label: `Your level in ${r.name}`, field_type: 'RADIO', options: LEVELS, help_text: r.min_value ? `Required level: ${r.min_value}` : null },
        { ...extra, label: `Years of experience with ${r.name}`, field_type: 'NUMBER' },
        { ...extra, label: `Describe a project or task where you used ${r.name}`, field_type: 'TEXTAREA' },
      ];
    case 'EXPERIENCE':
      return [
        { ...main, label: `Years of experience in ${r.name}${min}`, field_type: 'NUMBER' },
        { ...extra, label: `Describe your ${r.name} experience (roles, responsibilities)`, field_type: 'TEXTAREA' },
      ];
    case 'QUALIFICATION':
      return [
        { ...main, label: `Do you have ${r.name} or a higher qualification?`, field_type: 'RADIO', options: ['Yes', 'No', 'Currently studying'] },
        { ...extra, label: 'Degree name, institute and year', field_type: 'TEXT' },
      ];
    case 'CERTIFICATION':
      return [
        { ...main, label: `Do you hold the ${r.name} certification?`, field_type: 'RADIO', options: ['Yes', 'No', 'In progress'] },
        { ...extra, label: 'Certification name, issuer and year', field_type: 'TEXT' },
      ];
    default:
      return [{ ...main, label: r.name, field_type: 'TEXT' }];
  }
}

// Full generated form for a vacancy's requirements
function buildForm(requirements) {
  return [...STANDARD_FIELDS.map((f) => ({ ...f, is_standard: true })), ...requirements.flatMap(requirementFields), ...CLOSING_FIELDS.map((f) => ({ ...f, is_standard: true }))]
    .map((f) => ({
      requirement_id: f.requirement_id || null,
      field_key: f.field_key || null,
      is_standard: Boolean(f.is_standard),
      section: f.section,
      label: f.label.slice(0, 150),
      field_type: f.field_type,
      is_required: Boolean(f.is_required),
      options: f.options || null,
      help_text: f.help_text ? String(f.help_text).slice(0, 255) : null,
    }));
}

module.exports = {
  FIELD_TYPES,
  CHOICE_TYPES,
  SECTIONS,
  STANDARD_FIELDS,
  NOT_FOR_AI,
  CORE_KEYS,
  requirementFields,
  buildForm,
};
