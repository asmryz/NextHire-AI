
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import StageTracker from '../../components/StageTracker';
import Icon from '../../components/candidate/Icon';
import BackButton from '../../components/candidate/BackButton';
import ProgressRing from '../../components/candidate/ProgressRing';
import { closingLabel, fmtDate, initials } from '../../components/candidate/helpers';
import { Alert, Badge, Button, Spinner } from '../../components/ui';

const TYPE = {
  SKILL: { label: 'Skill', icon: 'sparkle' },
  EXPERIENCE: { label: 'Experience', icon: 'briefcase' },
  QUALIFICATION: { label: 'Qualification', icon: 'layers' },
  CERTIFICATION: { label: 'Certification', icon: 'shield' },
};

function RequirementList({ title, list }) {
  if (!list.length) return null;
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-muted">{title}</h3>
      <ul className="grid gap-3 sm:grid-cols-2">
        {list.map((r) => (
          <li key={r.requirement_id} className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-rust ring-1 ring-line">
              <Icon name={TYPE[r.req_type]?.icon || 'check'} />
            </span>
            <span className="min-w-0">
              <span className="block font-medium">{r.name}</span>
              <span className="mt-0.5 block text-[13px] text-muted">
                {TYPE[r.req_type]?.label}{r.min_value ? <> · <em>{r.min_value}</em></> : null}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function VacancyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/candidate/vacancies/${id}`)
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-24 text-rust"><Spinner label="Loading position" /></div>;

  if (!data) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-10 sm:px-8">
        <Alert type="error">{error || 'Vacancy not found.'}</Alert>
        <Link to="/candidate/vacancies" className="font-medium underline">Back to open positions</Link>
      </div>
    );
  }

  const { vacancy: v, my_application: mine, can_apply: canApply, reason, profile } = data;
  const mandatory = v.requirements.filter((r) => r.is_mandatory);
  const optional = v.requirements.filter((r) => !r.is_mandatory);
  const closing = closingLabel(v.end_date);
  const minutes = Math.max(3, Math.round(v.form_fields.length * 0.4));
  const profileReady = !profile || profile.completeness >= 100;

  return (
    <div className="flex flex-col">
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden bg-cream">
        <span aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-amber/20 blur-2xl" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 sm:px-8 lg:py-12">
          <BackButton to="/candidate/vacancies">All positions</BackButton>
          <div className="flex animate-fade-up items-start gap-4">
            <span aria-hidden="true" className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-semibold text-rust sm:flex">
              {initials(v.department)}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-muted">{v.department}</p>
              <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight sm:text-[38px]">{v.title}</h1>
              <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
                {v.location && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5"><Icon name="pin" className="h-3.5 w-3.5" />{v.location}</span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5">
                  <Icon name="calendar" className="h-3.5 w-3.5" />Open {fmtDate(v.start_date)} – {fmtDate(v.end_date)}
                </span>
                {v.is_open_now && (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${closing.urgent ? 'bg-danger-soft text-danger' : 'bg-white'}`}>
                    <Icon name="clock" className="h-3.5 w-3.5" />{closing.text}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* ---------------- Main content ---------------- */}
        <div className="flex min-w-0 flex-col gap-6">
          <section className="animate-fade-up rounded-3xl border border-line bg-white p-6 sm:p-8">
            <h2 className="text-lg font-semibold">About the role</h2>
            <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-brown/90">{v.description || 'No description provided.'}</p>
          </section>

          <section className="flex animate-fade-up flex-col gap-6 rounded-3xl border border-line bg-white p-6 [animation-delay:80ms] sm:p-8">
            <div>
              <h2 className="text-lg font-semibold">What we are looking for</h2>
              <p className="mt-1 text-sm text-muted">Must-have requirements carry the most weight in the evaluation.</p>
            </div>
            {v.requirements.length === 0 && <p className="text-sm text-muted">No requirements listed.</p>}
            <RequirementList title="Must have" list={mandatory} />
            <RequirementList title="Good to have" list={optional} />
          </section>

        </div>

        {/* ---------------- Apply panel ---------------- */}
        <aside className="lg:sticky lg:top-24">
          <div className="animate-fade-up rounded-3xl border border-line bg-white p-6 shadow-[0_20px_40px_-28px_rgba(77,42,0,0.45)]">
            {mine ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-semibold">You have applied</p>
                  <Badge status={mine.stage} />
                </div>
                <p className="text-sm text-muted">Submitted on {fmtDate(mine.submitted_at)}</p>
                <StageTracker stage={mine.stage} compact />
                <Button fullWidth variant="secondary" onClick={() => navigate(`/candidate/applications/${mine.application_id}`)}>View my application</Button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-lg font-semibold">Ready to apply?</p>
                  <p className="mt-1 text-sm text-muted">
                    {v.form_fields.length} questions · about {minutes} minutes. <em>No CV needed.</em>
                  </p>
                </div>

                <ul className="flex flex-col gap-3 text-sm">
                  <li className="flex items-center gap-3">
                    {profile ? <ProgressRing value={profile.completeness} size={44} stroke={5} /> : null}
                    <span>
                      <span className="block font-medium">Profile {profileReady ? 'complete' : `${profile.completeness}% complete`}</span>
                      <span className="block text-xs text-muted">{profileReady ? 'Your details will pre-fill the form.' : `Missing: ${profile.missing.join(', ')}`}</span>
                    </span>
                  </li>
                  <li className="flex items-center gap-3 text-muted">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper"><Icon name="info" /></span>
                    <span className="text-xs">You can have one active application at a time.</span>
                  </li>
                </ul>

                {reason && profileReady && <Alert type="info">{reason}</Alert>}

                {profileReady ? (
                  <Button fullWidth disabled={!canApply} onClick={() => navigate(`/candidate/vacancies/${v.vacancy_id}/apply`)}>
                    Apply now
                  </Button>
                ) : (
                  <Button fullWidth onClick={() => navigate('/candidate/profile')}>Complete my profile</Button>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
