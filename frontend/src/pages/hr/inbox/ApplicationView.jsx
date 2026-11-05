// frontend/src/pages/hr/inbox/ApplicationView.jsx
// Owner: Shivani
// SRS REQ-27: the full submitted form with all answers, the portfolio link and the current stage.
// Right column: Application ID -> Audit log -> AI evaluation (REQ-28) -> Employee referral -> Candidate.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../../services/api';
import { Alert, Avatar, Badge, Card, Checkbox, ConfirmDialog, Spinner } from '../../../components/ui';
import { SECTION_LABELS } from '../../../components/FormFieldInput';
import ReferralDialog from './ReferralDialog';

const TYPE = { SKILL: 'Skill', EXPERIENCE: 'Experience', QUALIFICATION: 'Qualification', CERTIFICATION: 'Certification' };
const STAGE = { APPLIED: 'Applied', SHORTLISTED: 'Shortlisted', INTERVIEW: 'Interview', OFFER: 'Offer', HIRED: 'Hired', REJECTED: 'Rejected' };
const TAG = { STRONG: 'Strong match', POSSIBLE: 'Possible match', NOT_A_FIT: 'Not a fit' };
const ACTION = {
  SUBMIT: 'Application submitted',
  REFERRAL_ADDED: 'Marked as employee referral',
  REFERRAL_UPDATED: 'Referral details updated',
  REFERRAL_REMOVED: 'Referral removed',
};
const WIDE = ['TEXTAREA', 'LIST'];
const fmt = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Audit log = audit_log rows + stage changes + AI evaluation, newest first
function buildLog(data) {
  const items = data.audit_log.map((l) => ({
    at: l.created_at,
    title: ACTION[l.action] || l.action.replace(/_/g, ' ').toLowerCase(),
    detail: l.action === 'SUBMIT' ? null : l.details,
    by: l.by_name,
  }));
  data.history
    .filter((h) => h.from_stage) // the first "Applied" row is the submission itself
    .forEach((h) => items.push({ at: h.changed_at, title: `Moved to ${STAGE[h.to_stage] || h.to_stage}`, by: h.changed_by || 'System' }));
  if (data.score?.evaluated_at) {
    items.push({
      at: data.score.evaluated_at,
      title: 'AI evaluation completed',
      detail: `${Math.round(data.score.fulfilment_pct)}% · ${TAG[data.score.ai_match_tag] || ''}`,
      by: 'AI Agent',
    });
  }
  if (!data.audit_log.some((l) => l.action === 'SUBMIT')) {
    items.push({ at: data.application.submitted_at, title: 'Application submitted', by: data.application.full_name });
  }
  return items.sort((a, b) => new Date(b.at) - new Date(a.at));
}

// Answers grouped by form section, keeping form order
function groupAnswers(answers) {
  const groups = [];
  answers.forEach((a) => {
    const last = groups[groups.length - 1];
    if (last && last.section === a.section) last.items.push(a);
    else groups.push({ section: a.section, items: [a] });
  });
  return groups;
}

// Role questions grouped by the requirement they belong to (badge shown once per requirement)
function groupByRequirement(items) {
  const blocks = [];
  items.forEach((a) => {
    const key = a.requirement_id || `q${a.field_id}`;
    const last = blocks[blocks.length - 1];
    if (last && last.key === key) last.items.push(a);
    else blocks.push({ key, req: a.requirement_id ? a : null, items: [a] });
  });
  return blocks;
}

// Question / answer pairs in two columns (long answers use the full width)
function Answers({ items }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((ans) => (
        <div key={ans.field_id} className={`flex min-w-0 flex-col gap-0.5 ${WIDE.includes(ans.field_type) ? 'sm:col-span-2' : ''}`}>
          <dt className="text-sm text-muted">{ans.label}</dt>
          <dd className="whitespace-pre-line break-words text-[16px] font-medium">
            {ans.answer_value || <span className="font-normal italic text-muted">Not answered</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SideCard({ title, children, action }) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

export default function ApplicationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(() => {
    return api
      .get(`/inbox/${id}`)
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  useEffect(() => {
    setData(null);
    setError('');
    load();
  }, [load]);

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <Alert type="error">{error}</Alert>
        <Link to="/hr/inbox" className="font-medium underline">Back to inbox</Link>
      </div>
    );
  }
  if (!data) return <div className="flex justify-center py-20 text-rust"><Spinner label="Loading application" /></div>;

  const { application: a, answers, score, score_breakdown: breakdown, duplicate_flags: flags, referral } = data;
  const log = buildLog(data);
  const fromForm = (key) => answers.find((x) => x.field_key === key)?.answer_value || null; // profile may be empty

  const onReferralToggle = (checked) => {
    setNotice('');
    if (checked) setDialogOpen(true);
    else setConfirmRemove(true);
  };

  const removeReferral = async () => {
    setRemoving(true);
    try {
      const { data: res } = await api.delete(`/inbox/${id}/referral`);
      setNotice(res.message);
      await load();
    } catch (err) {
      setNotice(getErrorMessage(err));
    } finally {
      setRemoving(false);
      setConfirmRemove(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex h-9 w-fit items-center gap-2 rounded-[10px] border border-line-strong bg-white px-3.5 text-sm font-medium text-brown transition-colors hover:border-amber hover:bg-cream-soft"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
        Back to inbox
      </button>

      {/* Header */}
      <Card className="flex flex-wrap items-center gap-4 p-4 sm:px-5">
        <Avatar name={a.full_name} src={a.profile_picture_url} size={56} />
        <div className="min-w-[220px] flex-1">
          <h1 className="text-2xl font-semibold">{a.full_name}</h1>
          <p className="mt-0.5 text-sm text-muted">
            Applied for <span className="font-medium text-brown">{a.vacancy_title}</span> · {a.department}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {referral && <Badge tone="dark">Employee referral</Badge>}
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
              <Link to={`/hr/inbox/${f.other_application_id}`} className="font-semibold underline">Ref No. {f.other_application_id}</Link>
              {f.match_reason ? ` (${f.match_reason})` : ''}
            </span>
          ))}
          .
        </Alert>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ---------------- Submitted form ---------------- */}
        <div className="min-w-0 rounded-[14px] border border-line bg-white">
          <div className="border-b border-line px-5 py-3.5">
            <h2 className="text-lg font-semibold">Submitted form</h2>
            <p className="text-sm text-muted">Answers exactly as the candidate entered them.</p>
          </div>

          {groupAnswers(answers).map((g) => (
            <section key={g.section} className="border-b border-line px-5 py-4 last:border-0">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-rust">{SECTION_LABELS[g.section] || g.section}</h3>
              {g.section === 'ROLE' ? (
                <div className="flex flex-col gap-3">
                  {groupByRequirement(g.items).map((block) => (
                    <div key={block.key} className="rounded-xl border border-line bg-paper/60 p-3.5">
                      {block.req && (
                        <div className="mb-3 flex flex-wrap items-center gap-1.5">
                          <Badge tone={block.req.is_mandatory ? 'warning' : 'neutral'}>
                            {TYPE[block.req.req_type]}: {block.req.requirement_name}
                            {block.req.min_value ? ` · min ${block.req.min_value}` : ''} · {block.req.weightage}%
                          </Badge>
                          {block.req.is_mandatory && <Badge tone="neutral">Mandatory</Badge>}
                        </div>
                      )}
                      <Answers items={block.items} />
                    </div>
                  ))}
                </div>
              ) : (
                <Answers items={g.items} />
              )}
            </section>
          ))}

          <section className="px-5 py-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-rust">Portfolio</h3>
            <p className="break-all text-sm">
              {a.portfolio_link ? (
                <a href={a.portfolio_link} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4 hover:text-rust">
                  {a.portfolio_link}
                </a>
              ) : <span className="text-muted">No link added</span>}
            </p>
          </section>
        </div>

        {/* ---------------- Right column ---------------- */}
        {/* Stays in view while the form scrolls (scrolls on its own if taller than the screen) */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-5 lg:max-h-[calc(100vh-2.5rem)] lg:overflow-y-auto lg:pr-1 lg:[scrollbar-width:thin]">
          <Card className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm text-muted">Application ID</p>
              <p className="mt-0.5 font-heading text-xl font-semibold">Ref No. {a.application_id}</p>
            </div>
            <p className="text-right text-xs text-muted">Submitted<br />{fmt(a.submitted_at)}</p>
          </Card>

          <SideCard title="Audit log">
            <ol className="flex flex-col gap-3 border-l-2 border-line pl-4">
              {log.map((item, i) => (
                <li key={i} className="relative">
                  <span aria-hidden="true" className={`absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full ${i === 0 ? 'bg-rust' : 'bg-line-strong'}`} />
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.detail && <p className="text-sm text-muted">{item.detail}</p>}
                  <p className="text-xs text-muted">{fmt(item.at)}{item.by ? ` · ${item.by}` : ''}</p>
                </li>
              ))}
            </ol>
          </SideCard>

          <SideCard title="AI evaluation">
            {!score ? (
              <p className="text-sm text-muted">Pending evaluation. The AI Agent has not scored this application yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-end justify-between gap-3">
                  <span className="font-heading text-[32px] font-semibold leading-none">{Math.round(score.fulfilment_pct)}%</span>
                  <span className="text-right text-xs text-muted">requirements met{score.rank_no ? <><br />Rank #{score.rank_no} for this vacancy</> : null}</span>
                </div>
                <span className="h-2 rounded-full bg-cream-soft">
                  <span className="block h-2 rounded-full bg-rust" style={{ width: `${Math.min(100, score.fulfilment_pct)}%` }} />
                </span>
                {score.final_match_tag && score.final_match_tag !== score.ai_match_tag && (
                  <p className="text-xs text-muted">AI tag was {TAG[score.ai_match_tag]}; changed by HR.</p>
                )}
                <ul className="flex flex-col gap-1.5">
                  {breakdown.map((b, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className={`mr-2 font-semibold ${b.is_met ? 'text-success' : 'text-danger'}`} aria-hidden="true">{b.is_met ? '✓' : '✗'}</span>
                        <span className="sr-only">{b.is_met ? 'Met:' : 'Missed:'}</span>
                        {b.name}
                        {b.is_mandatory && <span className="ml-1 text-xs text-muted">(mandatory)</span>}
                      </span>
                      <span className="whitespace-nowrap text-sm font-medium">{b.weight_awarded}/{b.weightage}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SideCard>

          <SideCard
            title="Employee referral"
            action={referral && (
              <button type="button" onClick={() => setDialogOpen(true)} className="min-h-9 rounded-lg px-2 text-sm font-medium underline underline-offset-4 hover:text-rust">
                View details
              </button>
            )}
          >
            <Alert type="info">{notice}</Alert>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Checkbox label="Referred by an employee" checked={Boolean(referral)} onChange={(e) => onReferralToggle(e.target.checked)} />
              {!referral && (
                <button type="button" onClick={() => setDialogOpen(true)} className="min-h-9 rounded-lg px-2 text-sm font-medium text-muted hover:text-brown">
                  Add details
                </button>
              )}
            </div>
            {referral && (
              <div className="rounded-lg bg-paper px-3.5 py-3 text-sm">
                <p className="font-medium">{referral.employee_name}</p>
                <p className="text-sm text-muted">{referral.employee_position} · {referral.employee_department}</p>
              </div>
            )}
          </SideCard>

          <SideCard title="Candidate">
            <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-muted">Name</dt><dd className="break-words font-medium">{a.full_name}</dd>
              <dt className="text-muted">Email</dt><dd className="break-all">{a.email}</dd>
              <dt className="text-muted">CNIC</dt><dd>{a.cnic || fromForm('cnic') || '—'}</dd>
              <dt className="text-muted">Phone</dt><dd>{a.phone || fromForm('phone') || '—'}</dd>
            </dl>
          </SideCard>
        </div>
      </div>

      <ReferralDialog
        open={dialogOpen}
        applicationId={a.application_id}
        referral={referral}
        onClose={() => setDialogOpen(false)}
        onSaved={async (message) => {
          setDialogOpen(false);
          setNotice(message);
          await load();
        }}
      />
      <ConfirmDialog
        open={confirmRemove}
        title="Remove referral"
        message={`Remove the employee referral from Ref No. ${a.application_id}? The referral details will be deleted.`}
        confirmText="Remove"
        cancelText="Cancel"
        danger
        loading={removing}
        onConfirm={removeReferral}
        onCancel={() => setConfirmRemove(false)}
      />
    </div>
  );
}
