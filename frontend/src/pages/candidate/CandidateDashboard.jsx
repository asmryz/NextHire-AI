// frontend/src/pages/candidate/CandidateDashboard.jsx
// Owner: Shivani
// Candidate home: welcome, the active application's progress, profile completeness, shortcuts.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import StageTracker from '../../components/StageTracker';
import { Avatar, Badge, Button, Card, Spinner } from '../../components/ui';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

export default function CandidateDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    api.get('/candidate/applications').then(({ data }) => setApps(data.applications)).catch(() => setApps([]));
    api.get('/candidate/profile').then(({ data }) => setProfile(data.profile)).catch(() => {});
  }, []);

  const active = apps?.find((a) => a.is_active && !['HIRED', 'REJECTED'].includes(a.stage));
  const latest = active || apps?.[0];

  return (
    <div className="flex flex-col">
      <section className="bg-cream">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-10">
          <div>
            <p className="text-sm font-medium text-muted">Welcome back</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {latest ? (active ? 'Your application is moving.' : 'Your latest application') : `Hi ${user?.full_name?.split(' ')[0] || ''}, find your next role.`}
            </h1>
          </div>

          {apps === null ? (
            <div className="flex justify-center py-6 text-rust"><Spinner label="Loading" /></div>
          ) : latest ? (
            <Card className="flex flex-col gap-4 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-xl font-bold">{latest.title}</p>
                  <p className="text-[13px] text-muted">{latest.department} · Submitted {fmtDate(latest.submitted_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge status={latest.stage} />
                  <Link to={`/candidate/applications/${latest.application_id}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:text-rust hover:underline">
                    View my form
                  </Link>
                </div>
              </div>
              <StageTracker stage={latest.stage} />
              {latest.interview_date && (
                <p className="rounded-xl bg-cream-soft px-4 py-3 text-sm">
                  <span className="font-semibold">Upcoming interview:</span> {fmtDate(`${latest.interview_date}T00:00:00`)} at {latest.interview_time}
                  {latest.interview_venue ? ` · ${latest.interview_venue}` : ''}
                </p>
              )}
            </Card>
          ) : (
            <div>
              <Button onClick={() => navigate('/candidate/vacancies')}>View open positions</Button>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-8 sm:px-10 md:grid-cols-3">
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-lg font-bold">Open positions</h2>
          <p className="text-sm text-muted">Browse every open vacancy. You can apply while you have no other active application.</p>
          <div className="mt-auto"><Button variant="secondary" onClick={() => navigate('/candidate/vacancies')}>Browse positions</Button></div>
        </Card>

        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-lg font-bold">My applications</h2>
          <p className="text-sm text-muted">{apps ? `${apps.length} application${apps.length === 1 ? '' : 's'} submitted.` : 'Loading…'}</p>
          <div className="mt-auto"><Button variant="secondary" onClick={() => navigate('/candidate/applications')}>Track applications</Button></div>
        </Card>

        <Card className="flex flex-col gap-3 p-6">
          <div className="flex items-center gap-3">
            <Avatar name={user?.full_name} src={user?.profile_picture_url} size={44} />
            <h2 className="text-lg font-bold">My profile</h2>
          </div>
          {profile && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[13px] font-medium"><span>Profile complete</span><span>{profile.completeness}%</span></div>
              <div className="h-2 rounded-full bg-cream" role="progressbar" aria-valuenow={profile.completeness} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness">
                <div className="h-2 rounded-full bg-rust" style={{ width: `${profile.completeness}%` }} />
              </div>
            </div>
          )}
          <div className="mt-auto"><Button variant="secondary" onClick={() => navigate('/candidate/profile')}>Edit profile</Button></div>
        </Card>
      </div>
    </div>
  );
}
