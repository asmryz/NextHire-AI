// frontend/src/pages/candidate/Apply.jsx
// Owner: Shivani
// SRS 4.3: the position-specific structured form (no CV), optional portfolio link,
// validation, submit -> confirmation email. Personal details are pre-filled from the profile.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import { Alert, Button, Card, Input, Spinner } from '../../components/ui';
import FormFieldInput, { groupBySection } from '../../components/FormFieldInput';
import LottiePlayer from '../../components/LottiePlayer';
import BackButton from '../../components/candidate/BackButton';
import successAnimation from '../../assets/success-check.json';

const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GENDER = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' };

// Answers taken from the candidate's profile (SRS: profile details pre-fill applications)
function prefill(fields, profile) {
  if (!profile) return {};
  const fromProfile = {
    full_name: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    cnic: profile.cnic,
    city: profile.city,
    gender: GENDER[profile.gender],
    highest_qualification: profile.highest_qualification,
  };
  const out = {};
  for (const f of fields) {
    const v = f.field_key ? fromProfile[f.field_key] : null;
    if (!v) continue;
    if (Array.isArray(f.options) && f.options.length && !f.options.includes(v)) continue; // must be a valid option
    out[f.field_id] = String(v);
  }
  return out;
}

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
    Promise.all([api.get(`/candidate/vacancies/${id}`), api.get('/candidate/profile').catch(() => ({ data: {} }))])
      .then(([vac, prof]) => {
        setData(vac.data);
        setAnswers(prefill(vac.data.vacancy.form_fields, prof.data.profile));
      })
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
      if (f.field_type === 'EMAIL' && !EMAIL_RE.test(v)) e[f.field_id] = 'Please enter a valid email address.';
      if (f.field_type === 'PHONE' && !/^\+?\d{10,15}$/.test(v.replace(/[\s-]/g, ''))) e[f.field_id] = 'Please enter a valid phone number.';
      if (f.field_key === 'cnic' && !/^\d{5}-\d{7}-\d$/.test(v)) e[f.field_id] = 'Please enter a valid CNIC (XXXXX-XXXXXXX-X).';
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
        <LottiePlayer data={successAnimation} loop={false} className="w-40" />
        <h1 className="text-3xl font-semibold tracking-tight">Application submitted</h1>
        <p className="text-sm text-muted">
          {done.message} You applied for <span className="font-medium text-brown">{v.title}</span>.
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
          <BackButton to={`/candidate/vacancies/${v.vacancy_id}`}>Back to vacancy</BackButton>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{v.department}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Apply for {v.title}</h1>
          <p className="text-sm text-muted">Answer the questions below. Fields marked * are required. No CV upload is needed.</p>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-10">
        {!canApply ? (
          <>
            <Alert type="info">{reason}</Alert>
            <div className="flex flex-wrap gap-3">
              {data.profile && data.profile.completeness < 100 && (
                <Button onClick={() => navigate('/candidate/profile')}>Complete my profile</Button>
              )}
              <Button variant="secondary" onClick={() => navigate('/candidate/vacancies')}>Browse other positions</Button>
            </div>
          </>
        ) : (
          <Card className="p-6">
            <Alert type="error" className="mb-5">{message}</Alert>
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
              {groupBySection(v.form_fields).map((g, gi) => (
                <section key={`${g.section}-${gi}`} className="flex flex-col gap-4 border-b border-line pb-6 last:border-0">
                  <h2 className="text-lg font-semibold">{g.label}</h2>
                  {g.fields.map((f) => (
                    <FormFieldInput
                      key={f.field_id}
                      field={f}
                      value={answers[f.field_id] || ''}
                      onChange={(val) => setAnswer(f.field_id, val)}
                      error={errors[f.field_id]}
                      readOnly={f.field_key === 'email'}
                    />
                  ))}
                </section>
              ))}

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
