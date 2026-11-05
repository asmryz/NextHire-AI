// frontend/src/pages/candidate/MyApplications.jsx
// Owner: Shivani
// SRS REQ-23: every application the candidate submitted, with its stage.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import StageTracker from '../../components/StageTracker';
import LottiePlayer from '../../components/LottiePlayer';
import Icon from '../../components/candidate/Icon';
import { STAGE_TEXT, fmtDate, initials } from '../../components/candidate/helpers';
import { Alert, Badge, Button, Spinner } from '../../components/ui';
import processingAnimation from '../../assets/application-processing.json';
import searchAnimation from '../../assets/job-search.json';

// kept for older imports
export { fmtDate };

const IN_PROGRESS = ['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFER'];

export default function MyApplications() {
  const navigate = useNavigate();
  const [apps, setApps] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/candidate/applications')
      .then(({ data }) => setApps(data.applications))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const inProgress = apps?.filter((a) => a.is_active && IN_PROGRESS.includes(a.stage)).length ?? 0;
  const interviews = apps?.filter((a) => a.stage === 'INTERVIEW').length ?? 0;

  return (
    <div className="flex flex-col">
      <section className="bg-cream">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-8 md:flex-row md:items-end md:justify-between">
          <div className="animate-fade-up">
            <h1 className="text-[30px] font-semibold leading-tight tracking-tight sm:text-[36px]">My applications</h1>
            <p className="mt-2 text-[15px] text-muted">Follow every position you applied for, step by step.</p>
          </div>
          <dl className="grid grid-cols-3 gap-3 md:w-[420px]">
            {[['Submitted', apps?.length ?? '–'], ['In progress', apps ? inProgress : '–'], ['Interviews', apps ? interviews : '–']].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/70 px-4 py-3">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-0.5 text-xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-8">
        <Alert type="error">{error}</Alert>

        {!apps && !error ? (
          <div className="flex justify-center py-16 text-rust"><Spinner label="Loading applications" /></div>
        ) : apps && apps.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong bg-white px-6 py-12 text-center">
            <LottiePlayer data={searchAnimation} className="w-56" />
            <p className="mt-2 text-lg font-semibold">You have not applied yet</p>
            <p className="mt-1 text-sm text-muted">Find an open position that fits you.</p>
            <Button className="mt-4" onClick={() => navigate('/candidate/vacancies')}>Browse open positions</Button>
          </div>
        ) : (
          <ul className="grid gap-5 lg:grid-cols-2">
            {(apps || []).map((a, i) => {
              const reviewing = a.is_active && ['APPLIED', 'SHORTLISTED'].includes(a.stage);
              return (
                <li
                  key={a.application_id}
                  className="flex animate-fade-up flex-col rounded-3xl border border-line bg-white p-5 transition-shadow hover:shadow-[0_16px_32px_-20px_rgba(77,42,0,0.35)] sm:p-6"
                  style={{ animationDelay: `${Math.min(i, 6) * 70}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream text-sm font-semibold text-rust">
                      {initials(a.department)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-muted">{a.department}</p>
                      <h2 className="text-[17px] font-semibold leading-snug">{a.title}</h2>
                      <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
                        <Icon name="calendar" className="h-3.5 w-3.5" /> Submitted {fmtDate(a.submitted_at)}
                      </p>
                    </div>
                    <Badge status={a.stage} />
                  </div>

                  <div className="mt-6"><StageTracker stage={a.stage} /></div>

                  {reviewing ? (
                    <div className="mt-5 flex items-center gap-3 rounded-2xl bg-paper px-3 py-2">
                      <div className="h-12 w-12 shrink-0 rounded-xl bg-brown p-0.5"><LottiePlayer data={processingAnimation} /></div>
                      <p className="text-sm italic text-muted">{STAGE_TEXT[a.stage]}</p>
                    </div>
                  ) : a.interview_date ? (
                    <p className="mt-5 flex items-center gap-2 rounded-2xl bg-cream-soft px-4 py-3 text-sm">
                      <Icon name="calendar" />
                      <span><span className="font-medium">Interview:</span> {fmtDate(a.interview_date)} at {a.interview_time}{a.interview_venue ? ` · ${a.interview_venue}` : ''}</span>
                    </p>
                  ) : null}

                  <div aria-hidden="true" className="min-h-5 flex-1" />
                  <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
                    <span className="text-xs text-muted">Updated {fmtDate(a.updated_at || a.submitted_at)}</span>
                    <Button variant="secondary" className="min-h-9 px-4 text-[13px]" onClick={() => navigate(`/candidate/applications/${a.application_id}`)}>
                      View details
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
