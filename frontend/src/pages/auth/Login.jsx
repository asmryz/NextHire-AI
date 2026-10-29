// frontend/src/pages/auth/Login.jsx
// Owner: Aarian
// SRS 4.1 Login: email + password -> JWT -> redirect by role.
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage, getFieldErrors } from '../../services/api';
import { homeForRole } from '../../utils/roles';
import { Alert, Button, Input } from '../../components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const notice =
    location.state?.message ||
    (params.get('expired') ? 'Your session has expired. Please log in again.' : '');

  if (user) return <Navigate to={homeForRole(user.role)} replace />;

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.email) next.email = 'This field is required.';
    else if (!EMAIL_RE.test(form.email.trim())) next.email = 'Please enter a valid email address.';
    if (!form.password) next.password = 'This field is required.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    setServerError('');
    try {
      const loggedIn = await login(form.email.trim(), form.password);
      const from = location.state?.from;
      const home = homeForRole(loggedIn.role);
      navigate(from && from.startsWith(home) ? from : home, { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Log in to continue to NexHire AI.</p>
      </div>

      <Alert type="info">{notice}</Alert>
      <Alert type="error">{serverError}</Alert>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={onChange} error={errors.email} required />
        <Input label="Password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={onChange} error={errors.password} required />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-semibold text-brown underline-offset-4 hover:text-rust hover:underline">
            Forgot Password?
          </Link>
        </div>
        <Button type="submit" loading={loading} fullWidth>Login</Button>
      </form>

      <p className="text-center text-sm text-muted">
        New candidate?{' '}
        <Link to="/signup" className="font-semibold text-brown underline-offset-4 hover:text-rust hover:underline">Create an account</Link>
      </p>
    </div>
  );
}
