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

// Same rules as the backend (utils/validators.js)
function validate(f) {
  const e = {};
  if (!f.full_name.trim()) e.full_name = 'This field is required.';
  if (!/^\d{5}-\d{7}-\d$/.test(f.cnic)) e.cnic = 'Please enter a valid CNIC (XXXXX-XXXXXXX-X).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Please enter a valid email address.';
  if (!/^\+?\d{10,15}$/.test(f.phone.replace(/[\s-]/g, ''))) e.phone = 'Please enter a valid phone number.';
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(f.password)) e.password = 'Password must be at least 8 characters long and contain both letters and numbers.';
  if (!f.confirm_password) e.confirm_password = 'This field is required.';
  else if (f.password !== f.confirm_password) e.confirm_password = 'Passwords do not match.';
  return e;
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
    setForm({ ...form, [name]: name === 'cnic' ? formatCnic(value) : value });
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
          <h1 className="text-3xl font-extrabold tracking-tight">Verify your email</h1>
          <p className="mt-1 text-sm text-muted">
            Enter the 6-digit code we sent to <span className="font-semibold text-brown">{form.email}</span>.
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
            className="[&_input]:text-center [&_input]:text-2xl [&_input]:font-semibold [&_input]:tracking-[0.5em]"
            required
          />
          <Button type="submit" loading={loading} fullWidth>Verify and create account</Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <button type="button" onClick={() => setStep(1)} className="min-h-11 font-semibold text-muted hover:text-brown">
            ← Change details
          </button>
          <button
            type="button"
            onClick={sendOtp}
            disabled={cooldown > 0 || loading}
            className="min-h-11 font-semibold text-brown hover:text-rust disabled:cursor-not-allowed disabled:text-muted"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Sign up as a candidate to apply for open positions.</p>
      </div>

      <Alert type="error">{serverError}</Alert>

      <form onSubmit={onSubmitForm} noValidate className="flex flex-col gap-4">
        <Input label="Full name" name="full_name" autoComplete="name" value={form.full_name} onChange={onChange} error={errors.full_name} required />
        <Input label="CNIC" name="cnic" inputMode="numeric" placeholder="XXXXX-XXXXXXX-X" value={form.cnic} onChange={onChange} error={errors.cnic} required />
        <Input label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={onChange} error={errors.email} required />
        <Input label="Phone number" name="phone" type="tel" autoComplete="tel" placeholder="03001234567" value={form.phone} onChange={onChange} error={errors.phone} required />
        <Input label="Password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={onChange} error={errors.password} hint="At least 8 characters, with letters and numbers." required />
        <Input label="Confirm password" name="confirm_password" type="password" autoComplete="new-password" value={form.confirm_password} onChange={onChange} error={errors.confirm_password} required />
        <Button type="submit" loading={loading} fullWidth>Register</Button>
      </form>

      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brown underline-offset-4 hover:text-rust hover:underline">Log in</Link>
      </p>
    </div>
  );
}
