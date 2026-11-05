// frontend/src/pages/candidate/Vacancies.jsx
// Owner: Shivani
// SRS REQ-17: open vacancies, search by title / department, filter by department.
// Candidates see every open position, but can apply only with a 100% profile and no other
// active application (BR-12).
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import LottiePlayer from '../../components/LottiePlayer';
import Icon from '../../components/candidate/Icon';
import VacancyCard from '../../components/candidate/VacancyCard';
import { Alert, Button, Select } from '../../components/ui';
import searchAnimation from '../../assets/job-search.json';

function SkeletonCard() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
      {[['h-11 w-11 rounded-xl', 'h-4 w-2/3'], ['h-3 w-20', 'h-3 w-24'], ['h-3 w-full', 'h-3 w-4/5']].map((row, i) => (
        <div key={i} className="flex items-center gap-3">
          {row.map((c) => (
            <span key={c} className={`${c} animate-shimmer rounded-full bg-[linear-gradient(90deg,var(--color-cream-soft),var(--color-cream),var(--color-cream-soft))] bg-[length:200%_100%]`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Vacancies() {
  const [departments, setDepartments] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({ search: '', department_id: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ vacancies: [], active_application: null, profile_completeness: 100, pagination: { page: 1, pages: 1, total: 0 } });
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
  const profileReady = (data.profile_completeness ?? 100) >= 100;
  const filtered = filters.search || filters.department_id;

  return (
    <div className="flex flex-col">
      {/* ---------------- Hero + search ---------------- */}
      <section className="relative overflow-hidden bg-cream">
        <span aria-hidden="true" className="absolute -left-20 top-10 h-60 w-60 rounded-full bg-amber/15 blur-2xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[1.4fr_1fr] lg:py-12">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs text-muted">
              <Icon name="briefcase" className="h-3.5 w-3.5" /> {pagination.total} open position{pagination.total === 1 ? '' : 's'}
            </p>
            <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-tight sm:text-[38px]">Find your next role</h1>
            <p className="mt-2 max-w-xl text-[15px] text-muted">
              Explore open positions and apply with a short structured form. <em>No CV upload needed.</em>
            </p>

            <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-white p-2 shadow-[0_12px_32px_-20px_rgba(77,42,0,0.45)] sm:flex-row">
              <label htmlFor="job-search" className="sr-only">Search positions</label>
              <div className="relative flex-1">
                <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                <input
                  id="job-search"
                  type="search"
                  placeholder="Search by job title or department"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="h-12 w-full rounded-xl bg-transparent pl-11 pr-3 text-[15px] text-brown placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-amber"
                />
              </div>
              <Select
                label="Department"
                hideLabel
                className="sm:w-60 [&_select]:h-12 [&_select]:rounded-xl [&_select]:border-transparent [&_select]:bg-paper"
                value={filters.department_id}
                onChange={(e) => { setFilters({ ...filters, department_id: e.target.value }); setPage(1); }}
                placeholder="All departments"
                options={departments.map((d) => ({ value: d.department_id, label: d.name }))}
              />
            </div>
          </div>
          <div className="hidden justify-center lg:flex">
            <LottiePlayer data={searchAnimation} className="w-full max-w-[380px] animate-float" />
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-8">
        <Alert type="error">{error}</Alert>

        {active && (
          <div role="note" className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber bg-cream-soft px-5 py-4 text-sm">
            <Icon name="info" className="h-5 w-5 text-rust" />
            <span className="min-w-[200px] flex-1">
              You already have an active application for <span className="font-medium">{active.title}</span>. You can apply again once it is closed.
            </span>
            <Link to="/candidate/applications" className="font-medium underline underline-offset-4 hover:text-rust">View application</Link>
          </div>
        )}
        {!active && !profileReady && (
          <div role="note" className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber bg-cream-soft px-5 py-4 text-sm">
            <Icon name="user" className="h-5 w-5 text-rust" />
            <span className="min-w-[200px] flex-1">
              Your profile is {data.profile_completeness}% complete. <span className="font-medium">Complete it to 100% to start applying.</span>
            </span>
            <Link to="/candidate/profile" className="font-medium underline underline-offset-4 hover:text-rust">Complete profile</Link>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{filtered ? 'Search results' : 'All open positions'}</h2>
          {!loading && <p className="text-sm text-muted">{pagination.total} found</p>}
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : vacancies.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong bg-white px-6 py-12 text-center">
            <LottiePlayer data={searchAnimation} className="w-56" />
            <p className="mt-2 text-lg font-semibold">No positions found</p>
            <p className="mt-1 text-sm text-muted">
              {filtered ? 'Try a different keyword or department.' : 'New positions are added regularly. Please check back soon.'}
            </p>
            {filtered && (
              <Button variant="secondary" className="mt-4" onClick={() => { setSearchText(''); setFilters({ search: '', department_id: '' }); }}>
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {vacancies.map((v, i) => (
              <VacancyCard key={v.vacancy_id} vacancy={v} index={i} disabled={Boolean(active) || !profileReady} />
            ))}
          </div>
        )}

        {pagination.pages > 1 && (
          <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-sm">
            <span className="text-muted">Page {pagination.page} of {pagination.pages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="secondary" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
