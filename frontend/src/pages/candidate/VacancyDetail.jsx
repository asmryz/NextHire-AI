// frontend/src/pages/candidate/VacancyDetail.jsx
// Owner: Shivani
// SRS REQ-18: full description and requirements of one vacancy, and whether the
// candidate can apply (not applied yet, still open, no other active application).
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import { Alert, Badge, Button, Card, Spinner } from '../../components/ui';

const TYPE_LABEL = { SKILL: 'Skill', EXPERIENCE: 'Experience', QUALIFICATION: 'Qualification', CERTIFICATION: 'Certification' };
const formatDate = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function VacancyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/candidate/vacancies/${id}`)
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20 text-rust"><Spinner label="Loading vacancy" /></div>;

  if (!data) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-10 sm:px-10">
        <Alert type="error">{error || 'Vacancy not found.'}</Alert>
        <Link to="/candidate/vacancies" className="font-semibold underline">Back to open positions</Link>
      </div>
    );
  }

  const { vacancy: v, my_application: mine, can_apply: canApply, reason } = data;
  const mandatory = v.requirements.filter((r) => r.is_mandatory);
  const optional = v.requirements.filter((r) => !r.is_mandatory);

  return (
    <div className="flex flex-col">
      <section className="bg-cream">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 sm:px-10">
          <Link to="/candidate/vacancies" className="w-fit text-sm font-semibold text-muted hover:text-brown">← All positions</Link>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{v.department}</p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{v.title}</h1>
          <p className="text-sm text-muted">
            {[v.location, `Open ${formatDate(v.start_date)} – ${formatDate(v.end_date)}`].filter(Boolean).join(' · ')}
          </p>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-10 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold">About the role</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{v.description || 'No description provided.'}</p>
          </Card>

          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-xl font-bold">Requirements</h2>
            {v.requirements.length === 0 && <p className="text-sm text-muted">No requirements listed.</p>}
            {[['Must have', mandatory], ['Good to have', optional]].map(([title, list]) =>
              list.length ? (
                <div key={title} className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-muted">{title}</h3>
                  <ul className="flex flex-col gap-2">
                    {list.map((r) => (
                      <li key={r.requirement_id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-paper px-4 py-3 text-sm">
                        <span className="font-semibold">{r.name}</span>
                        {r.min_value && <span className="text-muted">· {r.req_type === 'EXPERIENCE' ? `${r.min_value}+ years` : r.min_value}</span>}
                        <span className="ml-auto"><Badge tone={r.is_mandatory ? 'warning' : 'neutral'}>{TYPE_LABEL[r.req_type]}</Badge></span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null
            )}
          </Card>
        </div>

        {/* Apply panel */}
        <aside className="lg:sticky lg:top-6 lg:w-[320px] lg:shrink-0">
          <Card className="flex flex-col gap-4 p-6">
            {mine ? (
              <>
                <p className="font-heading text-lg font-bold">You applied</p>
                <p className="text-sm text-muted">Submitted on {new Date(mine.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                <div><Badge status={mine.stage} /></div>
                <Button variant="secondary" onClick={() => navigate('/candidate/applications')}>Track my application</Button>
              </>
            ) : (
              <>
                <p className="font-heading text-lg font-bold">Interested?</p>
                <p className="text-sm text-muted">
                  Apply by answering {v.form_fields.length} short question{v.form_fields.length === 1 ? '' : 's'}. No CV upload needed.
                </p>
                {reason && <Alert type="info">{reason}</Alert>}
                <Button fullWidth disabled={!canApply} onClick={() => navigate(`/candidate/vacancies/${v.vacancy_id}/apply`)}>
                  Apply now
                </Button>
              </>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
