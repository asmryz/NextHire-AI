// frontend/src/pages/hr/interviewers/InterviewerDetail.jsx
// Owner: Aarian
// HR opens one interviewer: account details, assigned interviews and recorded feedback.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../../services/api';
import { Alert, Avatar, Badge, Card, Spinner } from '../../../components/ui';

const fmt = (d, withTime) =>
  d ? new Date(d).toLocaleString('en-GB', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }) : '—';

export default function InterviewerDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/interviewers/${id}`)
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <Alert type="error">{error}</Alert>
        <Link to="/hr/interviewers" className="font-semibold underline">Back to interviewers</Link>
      </div>
    );
  }
  if (!data) return <div className="flex justify-center py-20 text-rust"><Spinner label="Loading interviewer" /></div>;

  const { interviewer: i, interviews, feedback } = data;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/hr/interviewers" className="w-fit text-sm font-semibold text-muted hover:text-brown">← All interviewers</Link>

      <Card className="flex flex-wrap items-center gap-5 p-6">
        <Avatar name={i.full_name} src={i.profile_picture_url} size={72} />
        <div className="min-w-[220px] flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold">{i.full_name}</h1>
            <Badge tone={i.status === 'ACTIVE' ? 'success' : 'danger'}>{i.status === 'ACTIVE' ? 'Active' : 'Deleted'}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">{[i.designation, i.department].filter(Boolean).join(' · ')}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <dt className="text-muted">Email</dt><dd className="break-all">{i.email}</dd>
          <dt className="text-muted">Phone</dt><dd>{i.phone || '—'}</dd>
          <dt className="text-muted">Created</dt><dd>{fmt(i.created_at)}{i.created_by_name ? ` by ${i.created_by_name}` : ''}</dd>
          <dt className="text-muted">Last login</dt><dd>{fmt(i.last_login_at, true)}</dd>
        </dl>
      </Card>

      <Card className="overflow-x-auto p-0">
        <h2 className="px-6 pt-5 text-xl font-bold">Assigned interviews</h2>
        {interviews.length === 0 ? (
          <p className="px-6 pb-6 pt-2 text-sm text-muted">No interviews assigned yet.</p>
        ) : (
          <table className="mt-3 w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-cream text-left text-xs uppercase tracking-[0.06em] text-muted">
                <th scope="col" className="px-6 py-3 font-semibold">Candidate</th>
                <th scope="col" className="px-4 py-3 font-semibold">Vacancy</th>
                <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                <th scope="col" className="px-4 py-3 font-semibold">Venue</th>
                <th scope="col" className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((iv) => (
                <tr key={iv.interview_id} className="border-t border-cream-soft">
                  <td className="px-6 py-3 font-semibold">{iv.candidate}</td>
                  <td className="px-4 py-3">{iv.vacancy}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{iv.slot_date ? `${fmt(`${iv.slot_date}T00:00:00`)} ${iv.start_time || ''}` : '—'}</td>
                  <td className="px-4 py-3">{iv.venue || '—'}</td>
                  <td className="px-6 py-3"><Badge tone="neutral">{iv.status.replace('_', ' ').toLowerCase()}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold">Recorded feedback</h2>
        {feedback.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No feedback recorded yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {feedback.map((f) => (
              <li key={f.feedback_id} className="rounded-xl border border-line bg-paper px-4 py-3 text-sm">
                <p className="text-xs text-muted">Interview #{f.interview_id} · {fmt(f.created_at, true)}</p>
                <p className="mt-1 whitespace-pre-line">{f.notes || '—'}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
