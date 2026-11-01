// frontend/src/pages/candidate/ApplicationDetail.jsx
// Owner: Shivani
// One application: stage, timeline and the answers the candidate submitted (read-only).
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import StageTracker from '../../components/StageTracker';
import { Alert, Badge, Card, Spinner } from '../../components/ui';

const LABEL = { APPLIED: 'Applied', SHORTLISTED: 'Shortlisted', INTERVIEW: 'Interview', OFFER: 'Offer', HIRED: 'Hired', REJECTED: 'Not successful' };
const fmt = (d) => new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export default function ApplicationDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/candidate/applications/${id}`)
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-10 sm:px-10">
        <Alert type="error">{error}</Alert>
        <Link to="/candidate/applications" className="font-semibold underline">Back to my applications</Link>
      </div>
    );
  }
  if (!data) return <div className="flex justify-center py-20 text-rust"><Spinner label="Loading application" /></div>;

  const { application: a, answers, history } = data;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-10">
      <Link to="/candidate/applications" className="w-fit text-sm font-semibold text-muted hover:text-brown">← My applications</Link>

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{a.department}</p>
            <h1 className="text-2xl font-extrabold">{a.title}</h1>
            <p className="text-[13px] text-muted">Submitted {fmt(a.submitted_at)} · Reference #{a.application_id}</p>
          </div>
          <Badge status={a.stage} />
        </div>
        <StageTracker stage={a.stage} />
      </Card>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <Card className="flex-1 p-6">
          <h2 className="text-xl font-bold">My answers</h2>
          <dl className="mt-4 flex flex-col gap-4">
            {answers.map((ans) => (
              <div key={ans.field_id} className="flex flex-col gap-1 border-b border-cream-soft pb-3 last:border-0">
                <dt className="text-[13px] font-semibold text-muted">{ans.label}</dt>
                <dd className="whitespace-pre-line break-words text-sm">{ans.answer_value || '—'}</dd>
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <dt className="text-[13px] font-semibold text-muted">Portfolio / context link</dt>
              <dd className="break-all text-sm">
                {a.portfolio_link ? (
                  <a href={a.portfolio_link} target="_blank" rel="noopener noreferrer" className="font-semibold underline">{a.portfolio_link}</a>
                ) : '—'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-6 lg:w-[300px] lg:shrink-0">
          <h2 className="text-xl font-bold">Timeline</h2>
          <ol className="mt-4 flex flex-col gap-4 border-l-2 border-cream pl-4">
            {history.map((h, i) => (
              <li key={i} className="relative">
                <span aria-hidden="true" className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-rust" />
                <p className="text-sm font-semibold">{LABEL[h.to_stage] || h.to_stage}</p>
                <p className="text-xs text-muted">{fmt(h.changed_at)}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
