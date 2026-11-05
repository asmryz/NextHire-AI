// frontend/src/pages/candidate/ApplicationDetail.jsx
// Owner: Shivani
// One application: progress, live status, timeline and the answers the candidate submitted (read-only).
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import StageTracker from '../../components/StageTracker';
import LottiePlayer from '../../components/LottiePlayer';
import { SECTION_LABELS } from '../../components/FormFieldInput';
import Icon from '../../components/candidate/Icon';
import { STAGE_TEXT, fmtDate, fmtDateTime } from '../../components/candidate/helpers';
import { Alert, Badge, Spinner } from '../../components/ui';
import processingAnimation from '../../assets/application-processing.json';

const LABEL = { APPLIED: 'Application submitted', SHORTLISTED: 'Shortlisted', INTERVIEW: 'Interview stage', OFFER: 'Offer made', HIRED: 'Hired', REJECTED: 'Not successful' };
const WIDE = ['TEXTAREA', 'LIST'];

function groupAnswers(answers) {
  const groups = [];
  answers.forEach((a) => {
    const last = groups[groups.length - 1];
    if (last && last.section === a.section) last.items.push(a);
    else groups.push({ section: a.section, items: [a] });
  });
  return groups;
}

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
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-10 sm:px-8">
        <Alert type="error">{error}</Alert>
        <Link to="/candidate/applications" className="font-medium underline">Back to my applications</Link>
      </div>
    );
  }
  if (!data) return <div className="flex justify-center py-24 text-rust"><Spinner label="Loading application" /></div>;

  const { application: a, answers, history } = data;
  const reviewing = a.is_active && ['APPLIED', 'SHORTLISTED'].includes(a.stage);
  const timeline = [...history].reverse();

  return (
    <div className="flex flex-col">
      {/* ---------------- Header ---------------- */}
      <section className="relative overflow-hidden bg-cream">
        <span aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-amber/20 blur-2xl" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 sm:px-8">
          <Link to="/candidate/applications" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-brown">
            <Icon name="back" /> My applications
          </Link>
          <div className="flex animate-fade-up flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted">{a.department}</p>
              <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight sm:text-[36px]">{a.title}</h1>
              <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5"><Icon name="calendar" className="h-3.5 w-3.5" />Submitted {fmtDate(a.submitted_at)}</span>
                {a.location && <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5"><Icon name="pin" className="h-3.5 w-3.5" />{a.location}</span>}
              </div>
            </div>
            <Badge status={a.stage} />
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Progress */}
          <section className="animate-fade-up rounded-3xl border border-line bg-white p-6 sm:p-8">
            <h2 className="text-lg font-semibold">Your progress</h2>
            <div className="mt-6"><StageTracker stage={a.stage} /></div>
          </section>

          {/* Answers */}
          <section className="animate-fade-up rounded-3xl border border-line bg-white [animation-delay:80ms]">
            <div className="border-b border-line px-6 py-5 sm:px-8">
              <h2 className="text-lg font-semibold">My answers</h2>
              <p className="mt-0.5 text-sm text-muted">Exactly what you submitted. Answers cannot be changed after submission.</p>
            </div>
            {groupAnswers(answers).map((g) => (
              <div key={g.section} className="border-b border-line px-6 py-6 last:border-0 sm:px-8">
                <h3 className="mb-5 text-xs font-medium uppercase tracking-[0.1em] text-rust">{SECTION_LABELS[g.section] || g.section}</h3>
                <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  {g.items.map((ans) => (
                    <div key={ans.field_id} className={`flex min-w-0 flex-col gap-1 ${WIDE.includes(ans.field_type) ? 'sm:col-span-2' : ''}`}>
                      <dt className="text-[13px] text-muted">{ans.label}</dt>
                      <dd className="whitespace-pre-line break-words text-[15px]">{ans.answer_value || <span className="italic text-muted">Not answered</span>}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
            <div className="px-6 py-6 sm:px-8">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.1em] text-rust">Portfolio</h3>
              {a.portfolio_link ? (
                <a href={a.portfolio_link} target="_blank" rel="noopener noreferrer" className="break-all text-[15px] underline underline-offset-4 hover:text-rust">{a.portfolio_link}</a>
              ) : <p className="text-sm italic text-muted">No link added</p>}
            </div>
          </section>
        </div>

        {/* ---------------- Side ---------------- */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          <section className="animate-fade-up rounded-3xl bg-brown p-6 text-cream">
            {reviewing && <LottiePlayer data={processingAnimation} className="mx-auto w-36" />}
            <p className="mt-2 text-xs uppercase tracking-[0.1em] text-amber">Current status</p>
            <p className="mt-1 text-lg font-semibold text-cream">{LABEL[a.stage] || a.stage}</p>
            <p className="mt-2 text-sm italic text-line-strong">{STAGE_TEXT[a.stage]}</p>
          </section>

          <section className="animate-fade-up rounded-3xl border border-line bg-white p-6 [animation-delay:80ms]">
            <h2 className="text-base font-semibold">Timeline</h2>
            <ol className="mt-5 flex flex-col gap-5 border-l-2 border-cream pl-5">
              {timeline.map((h, i) => (
                <li key={i} className="relative">
                  <span aria-hidden="true" className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${i === 0 ? 'bg-rust' : 'bg-line-strong'}`} />
                  <p className="text-sm font-medium">{LABEL[h.to_stage] || h.to_stage}</p>
                  <p className="text-xs text-muted">{fmtDateTime(h.changed_at)}</p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
