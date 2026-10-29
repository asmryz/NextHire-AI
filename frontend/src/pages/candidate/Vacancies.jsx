// frontend/src/pages/candidate/Vacancies.jsx
// Owner: Shivani
// SRS REQ-17: open vacancies, search by title / department, filter by department.
// Candidates can see every open position, but can only apply when they have no active application (BR-12).
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import { Alert, Badge, Button, Select, Spinner } from '../../components/ui';

const formatDate = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : null);

export default function Vacancies() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({ search: '', department_id: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ vacancies: [], active_application: null, pagination: { page: 1, pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/departments').then(({ data: d }) => setDepartments(d.departments || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchText.trim() }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchText]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page };
      if (filters.search) params.search = filters.search;
      if (filters.department_id) params.department_id = filters.department_id;
      const res = await api.get('/candidate/vacancies', { params });
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const { vacancies, active_application: active, pagination } = data;

  return (
    <div className="flex flex-col">
      <section className="bg-cream">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Open positions</h1>
            <p className="mt-1 text-sm text-muted">Find a role that fits you and apply with a short structured form. No CV needed.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div>
              <label htmlFor="job-search" className="sr-only">Search positions</label>
              <input
                id="job-search"
                type="search"
                placeholder="Search by title or department"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="h-11 w-full rounded-[10px] border border-line-strong bg-white px-3 text-sm text-brown focus:outline-none focus:ring-2 focus:ring-amber"
              />
            </div>
            <Select
              label="Department"
              hideLabel
              value={filters.department_id}
              onChange={(e) => { setFilters({ ...filters, department_id: e.target.value }); setPage(1); }}
              placeholder="All departments"
              options={departments.map((d) => ({ value: d.department_id, label: d.name }))}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-10">
        <Alert type="error">{error}</Alert>

        {active && (
          <div role="note" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber bg-cream-soft px-4 py-3 text-sm">
            <span className="flex-1">
              You already have an active application for <span className="font-semibold">{active.title}</span>. You can apply for another vacancy once it is closed.
            </span>
            <Link to="/candidate/applications" className="font-semibold underline-offset-4 hover:text-rust hover:underline">View my application</Link>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-rust"><Spinner label="Loading positions" /></div>
        ) : vacancies.length === 0 ? (
          <div className="rounded-2xl border border-line px-6 py-16 text-center">
            <p className="font-heading text-lg font-bold">No open positions found</p>
            <p className="mt-1 text-sm text-muted">
              {filters.search || filters.department_id ? 'Try a different search or department.' : 'New vacancies will appear here. Check back soon.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vacancies.map((v) => (
              <article key={v.vacancy_id} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{v.department}</span>
                  {v.has_applied && <Badge tone="success">Applied</Badge>}
                </div>
                <h2 className="text-lg font-bold leading-snug">{v.title}</h2>
                <p className="text-[13px] text-muted">
                  {[v.location, v.end_date && `Closes ${formatDate(v.end_date)}`].filter(Boolean).join(' · ')}
                </p>
                {v.summary && <p className="line-clamp-3 text-sm">{v.summary}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <Link to={`/candidate/vacancies/${v.vacancy_id}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:text-rust hover:underline">
                    View details
                  </Link>
                  {v.has_applied ? (
                    <Button variant="secondary" disabled>Applied</Button>
                  ) : (
                    <Button disabled={Boolean(active)} onClick={() => navigate(`/candidate/vacancies/${v.vacancy_id}`)}>Apply</Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-muted">Page {pagination.page} of {pagination.pages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="secondary" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
