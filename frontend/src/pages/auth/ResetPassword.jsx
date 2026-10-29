// frontend/src/pages/auth/ResetPassword.jsx
// Owner: Aarian
// Opened from the email link: /reset-password?token=...
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { getErrorMessage, getFieldErrors } from '../../services/api';
import { Alert, Button, Input } from '../../components/ui';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: '', confirm_password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(token ? '' : 'This reset link is invalid. Please request a new one.');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(form.password)) next.password = 'Password must be at least 8 characters long and contain both letters and numbers.';
    if (form.password !== form.confirm_password) next.confirm_password = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    setServerError('');
    try {
      const { data } = await api.post('/auth/reset-password', { token, ...form });
      navigate('/login', { replace: true, state: { message: data.message } });
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
        <h1 className="text-3xl font-extrabold tracking-tight">Choose a new password</h1>
        <p className="mt-1 text-sm text-muted">Use at least 8 characters with letters and numbers.</p>
      </div>

      <Alert type="error">
        {serverError}
        {serverError && (
          <>
            {' '}
            <Link to="/forgot-password" className="font-semibold underline">Request a new link</Link>
          </>
        )}
      </Alert>

      {token && (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Input label="New password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={onChange} error={errors.password} required />
          <Input label="Confirm new password" name="confirm_password" type="password" autoComplete="new-password" value={form.confirm_password} onChange={onChange} error={errors.confirm_password} required />
          <Button type="submit" loading={loading} fullWidth>Reset password</Button>
        </form>
      )}
    </div>
  );
}
