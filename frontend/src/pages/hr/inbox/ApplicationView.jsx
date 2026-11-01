// frontend/src/pages/hr/inbox/ApplicationView.jsx
// Owner: Shivani
// SRS REQ-27: the full submitted form with all answers, the portfolio link and the current stage.
// Shows the AI score breakdown when the AI Agent has evaluated it, otherwise "Pending evaluation" (REQ-28).
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../../services/api';
import { Alert, Avatar, Badge, Card, Spinner } from '../../../components/ui';

const TYPE = { SKILL: 'Skill', EXPERIENCE: 'Experience', QUALIFICATION: 'Qualification', CERTIFICATION: 'Certification' };
const fmt = (d) => new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const STAGE = { APPLIED: 'Applied', SHORTLISTED: 'Shortlisted', INTERVIEW: 'Interview', OFFER: 'Offer', HIRED: 'Hired', REJECTED: 'Rejected' };

export default function ApplicationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    api
      .get(`/inbox/${id}`)
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <Alert type="error">{error}</Alert>
        <Link to="/hr/inbox" className="font-semibold underline">Back to inbox</Link>
      </div>
    );
  }
  if (!data) return <div className="flex justify-center py-20 text-rust"><Spinner label="Loading application" /></div>;

  const { application: a, answers, history, score, score_breakdown: breakdown, duplicate_flags: flags } = data;

  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={() => navigate(-1)} className="min-h-11 w-fit text-sm font-semibold text-muted hover:text-brown">← Back to inbox</button>

      {/* Header */}
      <Card className="flex flex-wrap items-center gap-5 p-6">
        <Avatar name={a.full_name} src={a.profile_picture_url} size={72} />
        <div className="min-w-[220px] flex-1">
          <h1 className="text-2xl font-extrabold">{a.full_name}</h1>
          <p className="text-sm text-muted">
            Applied for <span className="font-semibold text-brown">{a.vacancy_title}</span> · {a.department}
          </p>
          <p className="text-xs text-muted">Submitted {fmt(a.submitted_at)} · Reference #{a.application_id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge status={a.stage} />
          {score ? <Badge status={score.final_match_tag || score.ai_match_tag} /> : <Badge status="PENDING" />}
        </div>
      </Card>

      {flags.length > 0 && (
        <Alert type="error">
          Possible duplicate: this application looks similar to{' '}
          {flags.map((f, i) => (
            <span key={f.flag_id}>
              {i > 0 && ', '}
              <Link to={`/hr/inbox/${f.other_application_id}`} className="font-semibold underline">#{f.other_application_id}</Link>
              {f.match_reason ? ` (${f.match_reason})` : ''}
            </span>
          ))}
          .
        </Alert>
      )}

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        {/* Answers */}
        <Card className="min-w-0 flex-1 p-6">
          <h2 className="text-xl font-bold">Submitted form</h2>
          <dl className="mt-4 flex flex-col gap-4">
            {answers.map((ans) => (
              <div key={ans.field_id} className="flex flex-col gap-1 border-b border-cream-soft pb-4 last:border-0">
                <dt className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-muted">
                  {ans.label}
                  {ans.requirement_name && (
                    <Badge tone={ans.is_mandatory ? 'warning' : 'neutral'}>
                      {TYPE[ans.req_type]}: {ans.requirement_name}
                      {ans.min_value ? ` (min ${ans.min_value})` : ''} · {ans.weightage}%
                    </Badge>
                  )}
                </dt>
                <dd className="whitespace-pre-line break-words text-sm">{ans.answer_value || <span className="text-muted">Not answered</span>}</dd>
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

        <div className="flex flex-col gap-6 xl:w-[360px] xl:shrink-0">
          {/* AI score */}
          <Card className="p-6">
            <h2 className="text-xl font-bold">AI evaluation</h2>
            {!score ? (
              <p className="mt-2 text-sm text-muted">Pending evaluation. The AI Agent has not scored this application yet.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="font-heading text-4xl font-extrabold">{Math.round(score.fulfilment_pct)}%</span>
                  <span className="text-sm text-muted">requirements fulfilled{score.rank_no ? ` · rank #${score.rank_no}` : ''}</span>
                </div>
                {score.final_match_tag && score.final_match_tag !== score.ai_match_tag && (
                  <p className="text-xs text-muted">AI tag was {score.ai_match_tag?.replace(/_/g, ' ').toLowerCase()}; changed by HR.</p>
                )}
                <ul className="flex flex-col gap-2">
                  {breakdown.map((b, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className={`mr-2 font-bold ${b.is_met ? 'text-success' : 'text-danger'}`} aria-hidden="true">{b.is_met ? '✓' : '✗'}</span>
                        <span className="sr-only">{b.is_met ? 'Met:' : 'Missed:'}</span>
                        {b.name}
                        {b.is_mandatory && <span className="ml-1 text-xs text-muted">(mandatory)</span>}
                      </span>
                      <span className="whitespace-nowrap font-semibold">{b.weight_awarded}/{b.weightage}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* Candidate details */}
          <Card className="p-6">
            <h2 className="text-xl font-bold">Candidate</h2>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Email</dt><dd className="break-all">{a.email}</dd>
              <dt className="text-muted">Phone</dt><dd>{a.phone || '—'}</dd>
              <dt className="text-muted">CNIC</dt><dd>{a.cnic || '—'}</dd>
              <dt className="text-muted">City</dt><dd>{a.city || '—'}</dd>
              <dt className="text-muted">Qualification</dt><dd>{a.highest_qualification || '—'}</dd>
            </dl>
          </Card>

          {/* Timeline */}
          <Card className="p-6">
            <h2 className="text-xl font-bold">Stage history</h2>
            <ol className="mt-4 flex flex-col gap-4 border-l-2 border-cream pl-4">
              {history.map((h, i) => (
                <li key={i} className="relative">
                  <span aria-hidden="true" className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-rust" />
                  <p className="text-sm font-semibold">{STAGE[h.to_stage] || h.to_stage}</p>
                  <p className="text-xs text-muted">{fmt(h.changed_at)}{h.changed_by ? ` · ${h.changed_by}` : ''}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
