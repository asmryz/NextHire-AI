// frontend/src/pages/candidate/Apply.jsx
// Owner: Shivani
// SRS 4.3: the position-specific structured form (no CV), optional portfolio link,
// validation, submit -> confirmation email.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import { Alert, Button, Card, Input, Spinner, Textarea } from '../../components/ui';

const INPUT_TYPE = { TEXT: 'text', NUMBER: 'number', DATE: 'date', LIST: 'text', URL: 'url' };
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i;

export default function Apply() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [portfolio, setPortfolio] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    api
      .get(`/candidate/vacancies/${id}`)
      .then(({ data: d }) => setData(d))
      .catch((err) => setMessage(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const setAnswer = (fieldId, value) => {
    setAnswers((a) => ({ ...a, [fieldId]: value }));
    setErrors((e) => ({ ...e, [fieldId]: '' }));
  };

  const validate = (fields) => {
    const e = {};
    for (const f of fields) {
      const v = String(answers[f.field_id] ?? '').trim();
      if (!v) {
        if (f.is_required) e[f.field_id] = 'This field is required';
        continue;
      }
      if (f.field_type === 'NUMBER' && (!Number.isFinite(Number(v)) || Number(v) < 0)) e[f.field_id] = 'Please enter a valid number.';
      if (f.field_type === 'URL' && !URL_RE.test(v)) e[f.field_id] = 'Please enter a valid URL';
    }
    if (portfolio.trim() && !URL_RE.test(portfolio.trim())) e.portfolio_link = 'Please enter a valid URL';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate(data.vacancy.form_fields)) {
      setMessage('Please correct the highlighted fields.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const { data: res } = await api.post(`/candidate/vacancies/${id}/apply`, { answers, portfolio_link: portfolio.trim() });
      setDone(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const apiErrors = err.response?.data?.errors || {};
      setErrors({ ...(apiErrors.answers || {}), ...(apiErrors.portfolio_link ? { portfolio_link: apiErrors.portfolio_link } : {}) });
      setMessage(getErrorMessage(err)); // keeps the form data on screen (SRS exception flow)
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-rust"><Spinner label="Loading form" /></div>;

  if (!data) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10 sm:px-10">
        <Alert type="error">{message || 'Vacancy not found.'}</Alert>
        <Link to="/candidate/vacancies" className="font-semibold underline">Back to open positions</Link>
      </div>
    );
  }

  const { vacancy: v, can_apply: canApply, reason } = data;

  // ---------- success screen
  if (done) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-10">
        <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-3xl text-success">✓</span>
        <h1 className="text-3xl font-extrabold tracking-tight">Application submitted</h1>
        <p className="text-sm text-muted">
          {done.message} You applied for <span className="font-semibold text-brown">{v.title}</span>. Reference #{done.application_id}.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => navigate(`/candidate/applications/${done.application_id}`)}>View my application</Button>
          <Button variant="secondary" onClick={() => navigate('/candidate')}>Go to dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <section className="bg-cream">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-8 sm:px-10">
          <Link to={`/candidate/vacancies/${v.vacancy_id}`} className="w-fit text-sm font-semibold text-muted hover:text-brown">← Back to vacancy</Link>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{v.department}</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Apply for {v.title}</h1>
          <p className="text-sm text-muted">Answer the questions below. Fields marked * are required. No CV upload is needed.</p>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-10">
        {!canApply ? (
          <>
            <Alert type="info">{reason}</Alert>
            <div><Button variant="secondary" onClick={() => navigate('/candidate/vacancies')}>Browse other positions</Button></div>
          </>
        ) : (
          <Card className="p-6">
            <Alert type="error" className="mb-5">{message}</Alert>
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
              {v.form_fields.map((f) =>
                f.field_type === 'TEXT' ? (
                  <Textarea
                    key={f.field_id}
                    label={f.label}
                    rows={3}
                    required={f.is_required}
                    maxLength={2000}
                    value={answers[f.field_id] || ''}
                    onChange={(e) => setAnswer(f.field_id, e.target.value)}
                    error={errors[f.field_id]}
                  />
                ) : (
                  <Input
                    key={f.field_id}
                    label={f.label}
                    type={INPUT_TYPE[f.field_type] || 'text'}
                    min={f.field_type === 'NUMBER' ? '0' : undefined}
                    step={f.field_type === 'NUMBER' ? 'any' : undefined}
                    required={f.is_required}
                    placeholder={f.field_type === 'URL' ? 'https://' : undefined}
                    hint={f.field_type === 'LIST' ? 'Separate items with commas, e.g. React, Node.js, SQL' : undefined}
                    value={answers[f.field_id] || ''}
                    onChange={(e) => setAnswer(f.field_id, e.target.value)}
                    error={errors[f.field_id]}
                  />
                )
              )}

              <Input
                label="Portfolio / context link (optional)"
                type="url"
                placeholder="https://github.com/your-name"
                hint="GitHub, LinkedIn or personal site. Not used for scoring."
                value={portfolio}
                onChange={(e) => { setPortfolio(e.target.value); setErrors((x) => ({ ...x, portfolio_link: '' })); }}
                error={errors.portfolio_link}
              />

              <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
                <Button type="submit" loading={submitting}>Submit application</Button>
                <span className="text-xs text-muted">You can apply to this vacancy only once.</span>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
