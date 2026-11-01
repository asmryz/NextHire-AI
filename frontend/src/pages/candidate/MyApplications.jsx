// frontend/src/pages/candidate/MyApplications.jsx
// Owner: Shivani
// SRS REQ-23: every application the candidate submitted, with its stage.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import StageTracker from '../../components/StageTracker';
import { Alert, Badge, Button, Spinner } from '../../components/ui';

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">My Applications</h1>
        <p className="mt-1 text-sm text-muted">Track every position you have applied for.</p>
      </div>

      <Alert type="error">{error}</Alert>

      {!apps && !error ? (
        <div className="flex justify-center py-16 text-rust"><Spinner label="Loading applications" /></div>
      ) : apps && apps.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line px-6 py-16 text-center">
          <p className="font-heading text-lg font-bold">You have not applied yet</p>
          <p className="text-sm text-muted">Find an open position that fits you.</p>
          <Button onClick={() => navigate('/candidate/vacancies')}>View open positions</Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {(apps || []).map((a) => (
            <li key={a.application_id} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{a.department}</p>
                  <h2 className="text-lg font-bold">{a.title}</h2>
                  <p className="text-[13px] text-muted">Submitted {fmtDate(a.submitted_at)} · Reference #{a.application_id}</p>
                </div>
                <Badge status={a.stage} />
              </div>

              <StageTracker stage={a.stage} />

              {a.interview_date && (
                <div className="rounded-xl bg-cream-soft px-4 py-3 text-sm">
                  <span className="font-semibold">Interview:</span> {fmtDate(`${a.interview_date}T00:00:00`)} at {a.interview_time}
                  {a.interview_venue ? ` · ${a.interview_venue}` : ''}
                </div>
              )}

              <div>
                <Link to={`/candidate/applications/${a.application_id}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:text-rust hover:underline">
                  View details and my answers
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
