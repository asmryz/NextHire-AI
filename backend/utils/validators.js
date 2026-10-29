// backend/utils/validators.js
// Owner: Aarian
// Input checks and the exact error messages from the SRS (section 4.1).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CNIC_RE = /^\d{5}-\d{7}-\d$/;           // what the user types: XXXXX-XXXXXXX-X
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PHONE_RE = /^\+?\d{10,15}$/;            // 03001234567 or +923001234567

const MESSAGES = {
  email: 'Please enter a valid email address.',
  cnic: 'Please enter a valid CNIC (XXXXX-XXXXXXX-X).',
  password: 'Password must be at least 8 characters long and contain both letters and numbers.',
  confirm: 'Passwords do not match.',
  phone: 'Please enter a valid phone number.',
  required: 'This field is required.',
};

const isEmail = (v) => typeof v === 'string' && EMAIL_RE.test(v.trim());
const isCnic = (v) => typeof v === 'string' && CNIC_RE.test(v.trim());
const isStrongPassword = (v) => typeof v === 'string' && PASSWORD_RE.test(v);
const isPhone = (v) => typeof v === 'string' && PHONE_RE.test(v.replace(/[\s-]/g, ''));

// "42101-1234567-1" -> "4210112345671" (database stores 13 digits)
const cleanCnic = (v) => v.replace(/-/g, '').trim();
const cleanEmail = (v) => v.trim().toLowerCase();
const cleanPhone = (v) => v.replace(/[\s-]/g, '');

// Returns { field: message } for every invalid field; empty object = valid.
function validateSignUp(body) {
  const errors = {};
  const { full_name, cnic, email, phone, password, confirm_password } = body || {};

  if (!full_name || !full_name.trim()) errors.full_name = MESSAGES.required;
  else if (full_name.trim().length > 100) errors.full_name = 'Name must be 100 characters or fewer.';

  if (!cnic) errors.cnic = MESSAGES.required;
  else if (!isCnic(cnic)) errors.cnic = MESSAGES.cnic;

  if (!email) errors.email = MESSAGES.required;
  else if (!isEmail(email)) errors.email = MESSAGES.email;

  if (!phone) errors.phone = MESSAGES.required;
  else if (!isPhone(phone)) errors.phone = MESSAGES.phone;

  if (!password) errors.password = MESSAGES.required;
  else if (!isStrongPassword(password)) errors.password = MESSAGES.password;

  if (!confirm_password) errors.confirm_password = MESSAGES.required;
  else if (password !== confirm_password) errors.confirm_password = MESSAGES.confirm;

  return errors;
}

module.exports = {
  MESSAGES,
  isEmail,
  isCnic,
  isStrongPassword,
  isPhone,
  cleanCnic,
  cleanEmail,
  cleanPhone,
  validateSignUp,
};
