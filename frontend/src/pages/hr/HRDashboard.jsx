// frontend/src/pages/hr/HRDashboard.jsx
// Owner: Aarian (analytics added for Shivani's request)
// HR home: KPIs + charts from GET /api/inbox/analytics.
// Charts are plain HTML/CSS (no chart library): magnitude = rust, AI match results = status colours with labels.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api, { getErrorMessage } from '../../services/api';
import { Alert, Avatar, Badge, Button, Card, Spinner } from '../../components/ui';

const STAGE_LABEL = { APPLIED: 'Applied', SHORTLISTED: 'Shortlisted', INTERVIEW: 'Interview', OFFER: 'Offer', HIRED: 'Hired', REJECTED: 'Rejected' };
const TAG_STYLE = {
  STRONG: { label: 'Strong match', color: '#2F7D32' },
  POSSIBLE: { label: 'Possible match', color: '#D98A00' },
  NOT_A_FIT: { label: 'Not a fit', color: '#B3261E' },
  PENDING: { label: 'Pending evaluation', color: '#9C8F80' },
};
const dayLabel = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const ago = (d) => {
  const mins = Math.round((Date.now() - new Date(d)) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const niceMax = (n) => {
  if (n <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(n));
  return Math.ceil(n / step) * step;
};

function Panel({ title, subtitle, action, className = '', children }) {
  return (
    <Card className={`flex min-w-0 flex-col gap-4 p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function StatTile({ label, value, note, tone = 'muted' }) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="font-heading text-[30px] font-semibold leading-tight">{value ?? '–'}</p>
      {note && <p className={`text-xs ${tone === 'up' ? 'text-success' : tone === 'down' ? 'text-danger' : 'text-muted'}`}>{note}</p>}
    </Card>
  );
}

// Applications per day (single series -> no legend; the title names it)
function TrendChart({ data }) {
  const [hover, setHover] = useState(null);
  const max = niceMax(Math.max(...data.map((d) => d.count), 0));
  const ticks = [max, max / 2, 0];
  return (
    <div className="flex flex-col gap-2">
      <div className="relative mt-2 h-48">
        {/* gridlines + y ticks */}
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${(t / max) * 100}%` }}>
            <span className="w-6 -translate-y-1/2 text-right text-xs text-muted">{t}</span>
            <span className="h-px flex-1 -translate-y-1/2 bg-line" />
          </div>
        ))}
        <div className="absolute inset-y-0 left-8 right-0 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => (
            <button
              key={d.day}
              type="button"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${dayLabel(d.day)}: ${d.count} application${d.count === 1 ? '' : 's'}`}
              className="group relative flex h-full flex-1 items-end justify-center rounded-md focus:outline-none focus-visible:bg-cream-soft"
            >
              <span
                className={`w-full max-w-[22px] rounded-t-[4px] transition-opacity ${hover === null || hover === i ? 'opacity-100' : 'opacity-50'}`}
                style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 4 : 0, background: '#CC6F00' }}
              />
              {hover === i && (
                <span className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg bg-brown px-2.5 py-1.5 text-xs text-cream shadow-sm">
                  {dayLabel(d.day)} · <span className="font-semibold">{d.count}</span>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="ml-8 flex justify-between text-xs text-muted">
        <span>{dayLabel(data[0].day)}</span>
        <span>{dayLabel(data[Math.floor(data.length / 2)].day)}</span>
        <span>Today</span>
      </div>
      <table className="sr-only">
        <caption>Applications per day</caption>
        <tbody>{data.map((d) => <tr key={d.day}><th>{dayLabel(d.day)}</th><td>{d.count}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

// Horizontal bars: label + value at the tip
function BarList({ rows, color = '#CC6F00', empty }) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  if (!max) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[110px_1fr_32px] items-center gap-3 text-sm sm:grid-cols-[190px_1fr_32px]">
          <span className="truncate text-muted" title={r.label}>{r.label}</span>
          <span className="h-3 rounded-full bg-cream-soft">
            <span
              className="block h-3 rounded-full"
              style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value ? 6 : 0, background: r.color || color }}
            />
          </span>
          <span className="text-right font-medium">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

function MatchResults({ tags }) {
  const total = tags.reduce((n, t) => n + t.count, 0);
  if (!total) return <p className="py-6 text-center text-sm text-muted">No applications yet.</p>;
  return (
    <div className="flex flex-col gap-4">
      {/* one 100% bar, 2px surface gaps between segments */}
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img"
        aria-label={tags.map((t) => `${TAG_STYLE[t.tag].label} ${t.count}`).join(', ')}>
        {tags.filter((t) => t.count).map((t) => (
          <span key={t.tag} style={{ width: `${(t.count / total) * 100}%`, background: TAG_STYLE[t.tag].color }} />
        ))}
      </div>
      <ul className="flex flex-col gap-1.5">
        {tags.map((t) => (
          <li key={t.tag}>
            <Link to={`/hr/inbox?tag=${t.tag}`} className="flex items-center justify-between gap-3 rounded-lg py-1 text-sm hover:text-rust">
              <span className="flex items-center gap-2.5">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: TAG_STYLE[t.tag].color }} />
                {TAG_STYLE[t.tag].label}
              </span>
              <span className="text-muted">
                <span className="font-medium text-brown">{t.count}</span> · {Math.round((t.count / total) * 100)}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HRDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/inbox/analytics')
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const k = data?.kpi;
  const weekDiff = k ? k.this_week - k.last_week : 0;

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-[28px]">Welcome, {user?.full_name?.split(' ')[0] || 'HR'}</h1>
          <p className="mt-1 text-sm text-muted">Here is how hiring is going today.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate('/hr/inbox')}>Application Inbox</Button>
          <Button onClick={() => navigate('/hr/vacancies/new')}>+ New Vacancy</Button>
        </div>
      </div>

      <Alert type="error">{error}</Alert>

      {!data && !error && <div className="flex justify-center py-20 text-rust"><Spinner label="Loading dashboard" /></div>}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Total applications"
              value={k.total_applications}
              note={`${k.this_week} this week${weekDiff ? ` (${weekDiff > 0 ? '+' : ''}${weekDiff} vs last week)` : ''}`}
              tone={weekDiff > 0 ? 'up' : weekDiff < 0 ? 'down' : 'muted'}
            />
            <StatTile label="Open vacancies" value={k.open_vacancies}
              note={k.closing_this_week ? `${k.closing_this_week} closing this week` : 'None closing this week'} />
            <StatTile
              label="Shortlisted"
              value={data.pipeline.find((p) => p.stage === 'SHORTLISTED')?.count ?? 0}
              note={`${data.pipeline.find((p) => p.stage === 'INTERVIEW')?.count ?? 0} in interview stage`}
            />
            <StatTile label="Pending evaluation" value={k.pending_evaluation}
              note={k.pending_evaluation ? 'Scored automatically by the AI Agent' : 'All applications are scored'} />
          </div>

          {k.draft_vacancies > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-cream-soft px-5 py-2.5 text-sm">
              <p>
                You have <span className="font-semibold">{k.draft_vacancies}</span> draft vacanc{k.draft_vacancies === 1 ? 'y' : 'ies'} waiting to be published.
              </p>
              <Link to="/hr/vacancies" className="font-medium underline underline-offset-4 hover:text-rust">Review drafts</Link>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Applications received" subtitle="Last 14 days" className="lg:col-span-2">
              <TrendChart data={data.trend} />
            </Panel>
            <Panel title="AI match results" subtitle="Active applications">
              <MatchResults tags={data.match_tags} />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Hiring pipeline" subtitle="Applications in each stage">
              <BarList rows={data.pipeline.map((p) => ({ label: STAGE_LABEL[p.stage], value: p.count }))} empty="No applications yet." />
            </Panel>
            <Panel title="Applications by department" subtitle="Top departments">
              <BarList rows={data.departments.map((d) => ({ label: d.department, value: d.count }))} empty="No applications yet." />
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <Panel
              title="Open vacancies"
              subtitle="Most applicants first"
              className="xl:col-span-3"
              action={<Link to="/hr/vacancies" className="text-sm font-medium underline underline-offset-4 hover:text-rust">View all</Link>}
            >
              {data.top_vacancies.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">No open vacancies.</p>
              ) : (
                <div className="-mx-5 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-sm text-muted">
                        <th className="px-5 pb-2.5 font-medium">Vacancy</th>
                        <th className="pb-2.5 font-medium">Applicants</th>
                        <th className="pb-2.5 font-medium">Strong matches</th>
                        <th className="px-5 pb-2.5 text-right font-medium">Closes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_vacancies.map((v) => (
                        <tr key={v.vacancy_id} className="border-b border-line last:border-0">
                          <td className="px-5 py-2.5">
                            <Link to={`/hr/inbox?vacancy_id=${v.vacancy_id}`} className="font-medium hover:text-rust">{v.title}</Link>
                            <p className="text-xs text-muted">{v.department}</p>
                          </td>
                          <td className="py-2.5">{v.applicants}</td>
                          <td className="py-2.5">{v.strong}</td>
                          <td className="px-5 py-2.5 text-right text-muted">
                            {v.end_date ? new Date(v.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '–'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel
              title="Recent applications"
              className="xl:col-span-2"
              action={<Link to="/hr/inbox" className="text-sm font-medium underline underline-offset-4 hover:text-rust">Open inbox</Link>}
            >
              {data.recent.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">No applications yet.</p>
              ) : (
                <ul className="-my-2 flex flex-col">
                  {data.recent.map((r) => (
                    <li key={r.application_id}>
                      <Link to={`/hr/inbox/${r.application_id}`} className="flex items-center gap-3 rounded-lg py-2 hover:bg-paper">
                        <Avatar name={r.candidate_name} src={r.profile_picture_url} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{r.candidate_name}</span>
                          <span className="block truncate text-xs text-muted">{r.vacancy_title} · {ago(r.submitted_at)}</span>
                        </span>
                        <Badge status={r.match_tag || 'PENDING'} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
