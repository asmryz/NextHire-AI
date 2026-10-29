// frontend/src/pages/auth/ForgotPassword.jsx
// Owner: Aarian
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import { Alert, Button, Input } from '../../components/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setServerError('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      setDone(data.message);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Forgot password</h1>
        <p className="mt-1 text-sm text-muted">Enter your registered email and we will send you a reset link.</p>
      </div>

      <Alert type="success">{done}</Alert>
      <Alert type="error">{serverError}</Alert>

      {!done && (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} error={error} required />
          <Button type="submit" loading={loading} fullWidth>Send reset link</Button>
        </form>
      )}

      <p className="text-center text-sm">
        <Link to="/login" className="font-semibold text-brown underline-offset-4 hover:text-rust hover:underline">Back to login</Link>
      </p>
    </div>
  );
}
