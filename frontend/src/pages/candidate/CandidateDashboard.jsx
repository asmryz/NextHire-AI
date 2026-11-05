// frontend/src/pages/candidate/CandidateDashboard.jsx
// Owner: Shivani
// Candidate home: greeting, live status of the active application (animated), progress tracker,
// profile completeness (must be 100% to apply), latest openings and "how hiring works".
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import StageTracker from '../../components/StageTracker';
import LottiePlayer from '../../components/LottiePlayer';
import Icon from '../../components/candidate/Icon';
import ProgressRing from '../../components/candidate/ProgressRing';
import VacancyCard from '../../components/candidate/VacancyCard';
import { STAGE_TEXT, fmtDate, greeting } from '../../components/candidate/helpers';
import { Badge, Button, Spinner } from '../../components/ui';
import processingAnimation from '../../assets/application-processing.json';
import searchAnimation from '../../assets/job-search.json';

const STEPS = [
  { icon: 'user', title: 'Complete your profile', text: 'Your details pre-fill every application.' },
  { icon: 'file', title: 'Apply with a short form', text: 'Answer role questions. No CV upload.' },
  { icon: 'sparkle', title: 'Fair AI-assisted screening', text: 'Only your answers are matched, never personal details.' },
  { icon: 'briefcase', title: 'Interview and offer', text: 'Our HR team takes the final decision.' },
];

export default function CandidateDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState(null);
  const [profile, setProfile] = useState(null);
  const [openings, setOpenings] = useState(null);

  useEffect(() => {
    api.get('/candidate/applications').then(({ data }) => setApps(data.applications)).catch(() => setApps([]));
    api.get('/candidate/profile').then(({ data }) => setProfile(data.profile)).catch(() => {});
    api.get('/candidate/vacancies', { params: { limit: 3 } })
      .then(({ data }) => setOpenings(data))
      .catch(() => setOpenings({ vacancies: [], pagination: { total: 0 } }));
  }, []);

  const active = apps?.find((a) => a.is_active && !['HIRED', 'REJECTED'].includes(a.stage));
  const latest = active || apps?.[0];
  const reviewing = active && ['APPLIED', 'SHORTLISTED'].includes(active.stage);
  const completeness = profile?.completeness ?? 0;
  const firstName = user?.full_name?.split(' ')[0] || '';

  return (
    <div className="flex flex-col">
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden bg-cream">
        <span aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber/20 blur-2xl" />
        <span aria-hidden="true" className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-paper/60 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:py-14">
          <div className="animate-fade-up">
            <p className="text-sm text-muted">{greeting()},</p>
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight sm:text-[40px]">{firstName || 'there'}.</h1>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
              {active
                ? <>Your application for <span className="font-medium text-brown">{active.title}</span> is in progress. <em>We will email you at every step.</em></>
                : <>Find a role that fits you and apply in minutes. <em>No CV needed, just a short structured form.</em></>}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => navigate('/candidate/vacancies')}>Browse open positions</Button>
              <Button variant="secondary" onClick={() => navigate(active ? `/candidate/applications/${active.application_id}` : '/candidate/profile')}>
                {active ? 'View my application' : 'Update my profile'}
              </Button>
            </div>

            <dl className="mt-8 grid max-w-lg grid-cols-3 gap-3">
              {[
                ['Open positions', openings?.pagination?.total ?? '–'],
                ['My applications', apps ? apps.length : '–'],
                ['Profile', profile ? `${completeness}%` : '–'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white/70 px-4 py-3 backdrop-blur">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="mt-0.5 text-xl font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Live status panel */}
          <div className="animate-fade-up rounded-3xl bg-brown p-6 text-cream shadow-[0_24px_48px_-24px_rgba(77,42,0,0.6)] [animation-delay:120ms] sm:p-7">
            {apps === null ? (
              <div className="flex justify-center py-16 text-amber"><Spinner label="Loading" /></div>
            ) : reviewing ? (
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                <LottiePlayer data={processingAnimation} className="w-36 shrink-0 sm:w-40" />
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-2 rounded-full bg-brown-light px-3 py-1 text-xs">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inset-0 animate-ping rounded-full bg-amber" />
                      <span className="relative h-2 w-2 rounded-full bg-amber" />
                    </span>
                    {active.stage === 'APPLIED' ? 'Under review' : 'Shortlisted'}
                  </span>
                  <p className="mt-3 text-lg font-semibold text-cream">{active.title}</p>
                  <p className="text-sm text-line-strong">{active.department}</p>
                  <p className="mt-3 text-sm italic text-line-strong">{STAGE_TEXT[active.stage]}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                <div className="w-44 shrink-0 rounded-2xl bg-cream p-2"><LottiePlayer data={searchAnimation} /></div>
                <div>
                  <p className="text-lg font-semibold text-cream">{latest ? STAGE_TEXT[latest.stage] : 'Your next role is waiting.'}</p>
                  <p className="mt-2 text-sm italic text-line-strong">
                    {openings?.pagination?.total ? `${openings.pagination.total} position${openings.pagination.total === 1 ? ' is' : 's are'} open right now.` : 'New positions are added regularly.'}
                  </p>
                  <Link to="/candidate/vacancies" className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-amber hover:underline">
                    Explore positions <Icon name="arrow" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-8">
        {/* ---------------- Profile completeness ---------------- */}
        {profile && completeness < 100 && (
          <section className="flex animate-fade-up flex-col gap-5 rounded-3xl border border-amber bg-cream-soft p-6 sm:flex-row sm:items-center">
            <ProgressRing value={completeness} size={76} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold">Complete your profile to start applying</h2>
              <p className="mt-1 text-sm text-muted">A 100% complete profile is required before you can apply. Still missing:</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {profile.missing.map((m) => (
                  <li key={m} className="rounded-full bg-white px-3 py-1 text-xs text-brown">{m}</li>
                ))}
              </ul>
            </div>
            <Button onClick={() => navigate('/candidate/profile')}>Complete profile</Button>
          </section>
        )}

        {/* ---------------- Progress of the latest application ---------------- */}
        {latest && (
          <section className="animate-fade-up rounded-3xl border border-line bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted">{active ? 'Current application' : 'Latest application'}</p>
                <h2 className="mt-1 text-xl font-semibold">{latest.title}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
                  <Icon name="calendar" className="h-3.5 w-3.5" /> Submitted {fmtDate(latest.submitted_at)} · {latest.department}
                </p>
              </div>
              <Badge status={latest.stage} />
            </div>
            <div className="mt-8"><StageTracker stage={latest.stage} /></div>
            {latest.interview_date && (
              <p className="mt-6 flex items-center gap-2 rounded-xl bg-cream-soft px-4 py-3 text-sm">
                <Icon name="calendar" />
                <span><span className="font-medium">Interview:</span> {fmtDate(latest.interview_date)} at {latest.interview_time}{latest.interview_venue ? ` · ${latest.interview_venue}` : ''}</span>
              </p>
            )}
            <div className="mt-6 flex justify-end border-t border-line pt-5">
              <Button variant="secondary" className="min-h-10 px-4" onClick={() => navigate(`/candidate/applications/${latest.application_id}`)}>
                View details
              </Button>
            </div>
          </section>
        )}

        {/* ---------------- Latest openings ---------------- */}
        <section className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Latest openings</h2>
              <p className="mt-1 text-sm text-muted">Positions you can apply for right now.</p>
            </div>
            <Link to="/candidate/vacancies" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium hover:text-rust">
              See all positions <Icon name="arrow" />
            </Link>
          </div>
          {openings === null ? (
            <div className="flex justify-center py-10 text-rust"><Spinner label="Loading positions" /></div>
          ) : openings.vacancies.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center text-sm text-muted">No open positions at the moment. Please check back soon.</p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {openings.vacancies.map((v, i) => (
                <VacancyCard key={v.vacancy_id} vacancy={v} index={i} disabled={Boolean(openings.active_application) || completeness < 100} />
              ))}
            </div>
          )}
        </section>

        {/* ---------------- How hiring works ---------------- */}
        <section className="rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
          <h2 className="text-xl font-semibold">How hiring works at NexHire</h2>
          <p className="mt-1 text-sm italic text-muted">Simple, transparent and fair for every candidate.</p>
          <ol className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4 lg:flex-col">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream text-rust">
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs text-muted">Step {i + 1}</p>
                  <p className="font-medium">{s.title}</p>
                  <p className="mt-1 text-sm text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
