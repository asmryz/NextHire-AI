// frontend/src/pages/hr/inbox/Inbox.jsx
// Owner: Shivani
// SRS 4.4 Application Inbox: one paginated list of applications with filters
// (vacancy, date range, score range, match tag, stage) and search by candidate name.
// Filters are kept while paging, and saved in the URL so "Back" returns to the same view.
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../../services/api';
import { Alert, Avatar, Badge, Button, Input, PageHeader, Select, Spinner } from '../../../components/ui';

const TAG_OPTIONS = [
  { value: 'STRONG', label: 'Strong Match' },
  { value: 'POSSIBLE', label: 'Possible Match' },
  { value: 'NOT_A_FIT', label: 'Not a Fit' },
  { value: 'PENDING', label: 'Pending evaluation' },
];
const STAGE_OPTIONS = ['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'].map((s) => ({
  value: s,
  label: s.charAt(0) + s.slice(1).toLowerCase(),
}));
const FILTER_KEYS = ['vacancy_id', 'from', 'to', 'min_score', 'max_score', 'tag', 'stage', 'search', 'sort'];

const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Inbox() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || ''])), [params]);
  const page = Number(params.get('page')) || 1;

  const [vacancies, setVacancies] = useState([]);
  const [searchText, setSearchText] = useState(filters.search);
  const [data, setData] = useState({ applications: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const update = (changes, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    api.get('/inbox/vacancies').then(({ data: d }) => setVacancies(d.vacancies)).catch(() => {});
  }, []);

  // Search after the user stops typing
  useEffect(() => {
    if (searchText.trim() === filters.search) return undefined;
    const t = setTimeout(() => update({ search: searchText.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    const query = { page, limit: 15 };
    FILTER_KEYS.forEach((k) => filters[k] && (query[k] = filters[k]));
    api
      .get('/inbox', { params: query })
      .then(({ data: d }) => alive && setData(d))
      .catch((err) => alive && setError(getErrorMessage(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [filters, page]);

  const activeCount = FILTER_KEYS.filter((k) => k !== 'search' && k !== 'sort' && filters[k]).length;
  const clearAll = () => {
    setSearchText('');
    setParams(new URLSearchParams(), { replace: true });
  };
  const { applications, pagination } = data;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Application Inbox" subtitle="Every application received, across all vacancies." />

      {/* Search + main filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[2fr_2fr_1fr_auto] md:items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="inbox-search" className="text-[length:var(--label-size,13px)] font-medium">Candidate name</label>
            <input
              id="inbox-search"
              type="search"
              placeholder="Search by name"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="h-[var(--field-h,2.75rem)] w-full rounded-[10px] border border-line-strong bg-white px-3 text-sm text-brown placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-amber"
            />
          </div>
          <Select
            label="Vacancy"
            value={filters.vacancy_id}
            onChange={(e) => update({ vacancy_id: e.target.value })}
            placeholder="All vacancies"
            options={vacancies.map((v) => ({ value: String(v.vacancy_id), label: `${v.title} (${v.applicants})${v.status !== 'OPEN' ? ' · closed' : ''}` }))}
          />
          <Select
            label="Sort by"
            value={filters.sort}
            onChange={(e) => update({ sort: e.target.value })}
            options={[{ value: '', label: 'Newest first' }, { value: 'score', label: 'Highest score' }]}
          />
          <Button variant="secondary" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters} aria-controls="inbox-more-filters">
            {showFilters ? 'Hide filters' : `More filters${activeCount ? ` (${activeCount})` : ''}`}
          </Button>
        </div>

        {showFilters && (
          <div id="inbox-more-filters" className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
            <Input label="From date" type="date" value={filters.from} onChange={(e) => update({ from: e.target.value })} />
            <Input label="To date" type="date" min={filters.from || undefined} value={filters.to} onChange={(e) => update({ to: e.target.value })} />
            <Input label="Min score %" type="number" min="0" max="100" value={filters.min_score} onChange={(e) => update({ min_score: e.target.value })} />
            <Input label="Max score %" type="number" min="0" max="100" value={filters.max_score} onChange={(e) => update({ max_score: e.target.value })} />
            <Select label="Match tag" value={filters.tag} onChange={(e) => update({ tag: e.target.value })} placeholder="Any tag" options={TAG_OPTIONS} />
            <Select label="Stage" value={filters.stage} onChange={(e) => update({ stage: e.target.value })} placeholder="Any stage" options={STAGE_OPTIONS} />
          </div>
        )}
      </div>

      <Alert type="error">{error}</Alert>

      {/* Results */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {loading ? (
          <div className="flex justify-center py-12 text-rust"><Spinner label="Loading applications" /></div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-base font-semibold">
              {activeCount || filters.search ? 'No applications match your filters' : 'No applications yet'}
            </p>
            {(activeCount > 0 || filters.search) && <Button variant="secondary" onClick={clearAll}>Clear filters</Button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-paper text-left text-xs uppercase tracking-[0.06em] text-muted">
                <th scope="col" className="px-3 py-3 font-medium">Candidate</th>
                <th scope="col" className="px-3 py-3 font-medium">Vacancy</th>
                <th scope="col" className="hidden px-3 py-3 font-medium xl:table-cell">Submitted</th>
                <th scope="col" className="px-3 py-3 font-medium">AI result</th>
                <th scope="col" className="px-3 py-3 font-medium">Stage</th>
                <th scope="col" className="px-3 py-3 text-right font-medium"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.application_id} className="border-t border-line transition-colors hover:bg-paper">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="hidden xl:block"><Avatar name={a.candidate_name} src={a.profile_picture_url} size={36} /></span>
                      <div className="min-w-0">
                        <p className="font-medium">{a.candidate_name}</p>
                        <p className="max-w-[180px] truncate text-xs italic text-muted" title={a.candidate_email}>{a.candidate_email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium">{a.vacancy_title}</p>
                    <p className="text-xs italic text-muted">{a.department}</p>
                    <p className="text-xs text-muted xl:hidden">{fmt(a.submitted_at)}</p>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2.5 text-muted xl:table-cell">{fmt(a.submitted_at)}</td>
                  <td className="px-3 py-2.5">
                    {/* AI score + match tag together */}
                    <div className="flex flex-col items-start gap-1.5">
                      {a.pending_evaluation ? (
                        <Badge status="PENDING" />
                      ) : (
                        <>
                          <span className="flex items-center gap-2">
                            <span className="h-1.5 w-12 rounded-full bg-cream-soft"><span className="block h-1.5 rounded-full bg-rust" style={{ width: `${Math.min(100, a.score)}%` }} /></span>
                            <span className="font-semibold">{Math.round(a.score)}%</span>
                          </span>
                          {a.match_tag && <Badge status={a.match_tag} />}
                        </>
                      )}
                      {a.possible_duplicate && <Badge tone="danger">Possible duplicate</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><Badge status={a.stage} /></td>
                  <td className="px-3 py-2.5 text-right">
                    <Link to={`/hr/inbox/${a.application_id}`} className="inline-flex h-8 items-center rounded-lg border border-line-strong px-3 text-xs font-medium hover:border-amber hover:bg-cream-soft">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {pagination.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-muted">
            {pagination.total} application{pagination.total === 1 ? '' : 's'} · page {pagination.page} of {pagination.pages}
          </span>
          {pagination.pages > 1 && (
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, false)}>Previous</Button>
              <Button variant="secondary" disabled={page >= pagination.pages} onClick={() => update({ page: String(page + 1) }, false)}>Next</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
