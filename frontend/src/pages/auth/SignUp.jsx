// frontend/src/pages/auth/SignUp.jsx
// Owner: Aarian
// SRS 4.1 Sign Up + email OTP:
//   Step 1: fill form -> backend validates and emails a 6-digit code
//   Step 2: enter code -> account is created -> go to login
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage, getFieldErrors } from '../../services/api';
import { Alert, Button, Input } from '../../components/ui';

const EMPTY = { full_name: '', cnic: '', email: '', phone: '', password: '', confirm_password: '' };
const RESEND_SECONDS = 60;

// Password rules, shown live under the password box
const PASSWORD_RULES = [
  { short: '8+ characters', test: (p) => p.length >= 8 },
  { short: 'a capital letter', test: (p) => /[A-Z]/.test(p) },
  { short: 'a small letter', test: (p) => /[a-z]/.test(p) },
  { short: 'a number', test: (p) => /\d/.test(p) },
  { short: 'a symbol (@ # $ !)', test: (p) => /[^A-Za-z0-9\s]/.test(p) },
];

// Same rules as the backend (utils/validators.js), a little stricter for passwords
function validate(f) {
  const e = {};
  const name = f.full_name.trim();
  if (!name) e.full_name = 'This field is required.';
  else if (name.length < 3) e.full_name = 'Please enter your full name.';

  if (!f.cnic) e.cnic = 'This field is required.';
  else if (!/^\d{5}-\d{7}-\d$/.test(f.cnic)) e.cnic = 'CNIC must have 13 digits (XXXXX-XXXXXXX-X).';

  if (!f.email.trim()) e.email = 'This field is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Please enter a valid email address.';

  if (!f.phone) e.phone = 'This field is required.';
  else if (!/^03\d{9}$/.test(f.phone)) e.phone = 'Enter an 11-digit mobile number starting with 03.';

  if (!f.password) e.password = 'This field is required.';
  else if (!PASSWORD_RULES.every((r) => r.test(f.password))) e.password = 'Password does not meet the rules.';

  if (!f.confirm_password) e.confirm_password = 'This field is required.';
  else if (f.password !== f.confirm_password) e.confirm_password = 'Passwords do not match.';
  return e;
}

// Cleans what the user types, so wrong characters never appear in the box
const CLEAN = {
  full_name: (v) => v.replace(/[^A-Za-z .'-]/g, '').replace(/\s{2,}/g, ' ').slice(0, 60), // letters only
  cnic: (v) => formatCnic(v),                                                           // 13 digits, dashes added
  phone: (v) => v.replace(/\D/g, '').slice(0, 11),                                      // 11 digits only
  email: (v) => v.replace(/\s/g, '').toLowerCase(),
};

// Shows only the rules still missing, while the user is typing
function PasswordHint({ password }) {
  if (!password) return <p className="text-xs text-muted">Use 8+ characters with a capital letter, a small letter, a number and a symbol.</p>;
  const missing = PASSWORD_RULES.filter((r) => !r.test(password));
  if (!missing.length) return <p className="text-xs text-success">Strong password.</p>;
  return <p className="text-xs text-muted">Still needed: {missing.map((r) => r.short).join(', ')}.</p>;
}

// Types 4210112345671 as 42101-1234567-1 automatically
function formatCnic(value) {
  const d = value.replace(/\D/g, '').slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

export default function SignUp() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: CLEAN[name] ? CLEAN[name](value) : value });
    setErrors({ ...errors, [name]: '' });
  };

  const sendOtp = async () => {
    setLoading(true);
    setServerError('');
    try {
      const { data } = await api.post('/auth/register/send-otp', form);
      setInfo(data.message);
      setStep(2);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setErrors(getFieldErrors(err));
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onSubmitForm = (e) => {
    e.preventDefault();
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    sendOtp();
  };

  const onVerify = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setErrors({ otp: 'Please enter the 6-digit code.' });
      return;
    }
    setLoading(true);
    setServerError('');
    try {
      const { data } = await api.post('/auth/register/verify', { ...form, otp });
      navigate('/login', { replace: true, state: { message: data.message } });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Verify your email</h1>
          <p className="mt-1 text-sm text-muted">
            Enter the 6-digit code we sent to <span className="font-medium text-brown">{form.email}</span>.
          </p>
        </div>

        <Alert type="success">{info}</Alert>
        <Alert type="error">{serverError}</Alert>

        <form onSubmit={onVerify} noValidate className="flex flex-col gap-4">
          <Input
            label="Verification code"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
              setErrors({});
            }}
            error={errors.otp}
            className="[&_input]:text-center [&_input]:text-xl [&_input]:font-medium [&_input]:tracking-[0.5em]"
            required
          />
          <Button type="submit" loading={loading} fullWidth>Verify and create account</Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <button type="button" onClick={() => setStep(1)} className="min-h-11 text-muted hover:text-brown">
            ← Change details
          </button>
          <button
            type="button"
            onClick={sendOtp}
            disabled={cooldown > 0 || loading}
            className="min-h-11 font-medium text-brown hover:text-rust disabled:cursor-not-allowed disabled:text-muted"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted">Sign up to apply for open positions.</p>
      </div>

      <Alert type="error">{serverError}</Alert>

      <form onSubmit={onSubmitForm} noValidate className="flex flex-col gap-4">
        <Input
          label="Full name" name="full_name" autoComplete="name" maxLength={60}
          value={form.full_name} onChange={onChange} error={errors.full_name} required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="CNIC" name="cnic" inputMode="numeric" placeholder="XXXXX-XXXXXXX-X" maxLength={15}
            value={form.cnic} onChange={onChange} error={errors.cnic} required
          />
          <Input
            label="Mobile number" name="phone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="03XXXXXXXXX" maxLength={11}
            value={form.phone} onChange={onChange} error={errors.phone} required
          />
        </div>

        <Input
          label="Email" name="email" type="email" autoComplete="email"
          value={form.email} onChange={onChange} error={errors.email} required
        />

        <div className="flex flex-col gap-1.5">
          <Input
            label="Password" name="password" type="password" autoComplete="new-password"
            value={form.password} onChange={onChange} error={errors.password} required
          />
          {!errors.password && <PasswordHint password={form.password} />}
        </div>

        <Input
          label="Confirm password" name="confirm_password" type="password" autoComplete="new-password"
          value={form.confirm_password} onChange={onChange} error={errors.confirm_password} required
        />

        <Button type="submit" loading={loading} fullWidth className="mt-1">Continue</Button>
      </form>

      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brown underline underline-offset-4 hover:text-rust">Log in</Link>
      </p>
    </div>
  );
}