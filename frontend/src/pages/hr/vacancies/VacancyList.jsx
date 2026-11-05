// frontend/src/pages/hr/vacancies/VacancyList.jsx
// Owner: Aarian
// SRS 4.2 (REQ-14, REQ-15): list vacancies with status, search, filter by department,
// edit, close, delete (only without applications), pagination.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../../services/api';
import { useDepartments } from '../../../services/departments';
import { Alert, Badge, Button, ConfirmDialog, PageHeader, Select, Spinner } from '../../../components/ui';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
];

const formatDate = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function VacancyList() {
  const navigate = useNavigate();
  const { departments } = useDepartments();

  const [filters, setFilters] = useState({ search: '', department_id: '', status: '' });
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ vacancies: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState(null); // { type: 'close'|'delete', vacancy }
  const [busy, setBusy] = useState(false);

  // Wait until the user stops typing before searching
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
      const params = { page, limit: 10 };
      if (filters.search) params.search = filters.search;
      if (filters.department_id) params.department_id = filters.department_id;
      if (filters.status) params.status = filters.status;
      const res = await api.get('/vacancies', { params });
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

  const onFilter = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1);
  };

  const runAction = async () => {
    if (!confirm) return;
    setBusy(true);
    setError('');
    try {
      const { vacancy, type } = confirm;
      const res =
        type === 'delete'
          ? await api.delete(`/vacancies/${vacancy.vacancy_id}`)
          : await api.post(`/vacancies/${vacancy.vacancy_id}/close`);
      setNotice(res.data.message);
      setConfirm(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const { vacancies, pagination } = data;
  const hasFilters = filters.search || filters.department_id || filters.status;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Vacancies"
        subtitle="Create positions, set requirements and publish the application form."
        actions={<Button onClick={() => navigate('/hr/vacancies/new')}>+ New Vacancy</Button>}
      />

      <Alert type="success">{notice}</Alert>
      <Alert type="error">{error}</Alert>

      {/* Filters */}
      <div className="grid gap-3 rounded-2xl border border-line bg-white p-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <div className="relative">
          <label htmlFor="vacancy-search" className="sr-only">Search vacancies</label>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5" /></svg>
          <input
            id="vacancy-search"
            type="search"
            placeholder="Search by title or department"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="h-10 w-full rounded-[10px] border border-line-strong bg-white pl-9 pr-3 text-sm text-brown placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-amber"
          />
        </div>
        <Select
          label="Department"
          hideLabel
          name="department_id"
          value={filters.department_id}
          onChange={onFilter}
          placeholder="All departments"
          options={departments.map((d) => ({ value: d.department_id, label: d.name }))}
        />
        <Select label="Status" hideLabel name="status" value={filters.status} onChange={onFilter} placeholder="All statuses" options={STATUS_OPTIONS} />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {loading ? (
          <div className="flex justify-center py-12 text-rust"><Spinner label="Loading vacancies" /></div>
        ) : vacancies.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <p className="text-base font-semibold">{hasFilters ? 'No vacancies match your filters' : 'No vacancies yet'}</p>
            <p className="text-sm italic text-muted">{hasFilters ? 'Try a different search or clear the filters.' : 'Create your first vacancy to start receiving applications.'}</p>
            <div className="mt-2">
              {hasFilters ? (
                <Button variant="secondary" onClick={() => { setSearchText(''); setFilters({ search: '', department_id: '', status: '' }); }}>Clear filters</Button>
              ) : (
                <Button onClick={() => navigate('/hr/vacancies/new')}>+ New Vacancy</Button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="bg-paper text-left text-xs uppercase tracking-[0.06em] text-muted">
                  <th scope="col" className="px-4 py-3 font-medium">Position</th>
                  <th scope="col" className="px-4 py-3 font-medium">Department</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Applicants</th>
                  <th scope="col" className="px-4 py-3 font-medium">Open from</th>
                  <th scope="col" className="px-4 py-3 font-medium">Closes</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vacancies.map((v) => {
                  const canEdit = v.status === 'DRAFT' || v.status === 'OPEN';
                  const canDelete = v.applicants === 0;
                  return (
                    <tr key={v.vacancy_id} className="border-t border-line transition-colors hover:bg-paper">
                      <td className="px-4 py-3">
                        <Link to={`/hr/vacancies/${v.vacancy_id}`} className="font-medium hover:text-rust">{v.title}</Link>
                        {v.location && <span className="block text-xs italic text-muted">{v.location}</span>}
                      </td>
                      <td className="px-4 py-3 text-muted">{v.department}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex min-w-8 justify-center rounded-full bg-cream-soft px-2.5 py-0.5 font-medium">{v.applicants}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(v.start_date)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(v.end_date)}</td>
                      <td className="px-4 py-3"><Badge status={v.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5 whitespace-nowrap">
                          <Link to={`/hr/vacancies/${v.vacancy_id}`} className="inline-flex h-8 items-center rounded-lg border border-line-strong px-3 text-xs font-medium hover:border-amber hover:bg-cream-soft">
                            {canEdit ? 'Edit' : 'View'}
                          </Link>
                          {canEdit && (
                            <button type="button" onClick={() => setConfirm({ type: 'close', vacancy: v })} className="h-8 rounded-lg border border-line-strong px-3 text-xs font-medium hover:border-amber hover:bg-cream-soft">
                              Close
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setConfirm({ type: 'delete', vacancy: v })}
                            disabled={!canDelete}
                            title={canDelete ? undefined : 'Has applications: close it instead'}
                            className="h-8 rounded-lg border border-danger/30 px-3 text-xs font-medium text-danger hover:bg-danger-soft disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:opacity-60 disabled:hover:bg-transparent"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-muted">Page {pagination.page} of {pagination.pages} · {pagination.total} vacancies</span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="secondary" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.type === 'delete' ? 'Delete vacancy' : 'Close vacancy'}
        message={
          confirm?.type === 'delete'
            ? `Delete "${confirm?.vacancy.title}"? Its requirements and form will be removed. This cannot be undone.`
            : `Close "${confirm?.vacancy.title}"? Candidates will no longer be able to apply.`
        }
        confirmText={confirm?.type === 'delete' ? 'Delete' : 'Close vacancy'}
        cancelText="Cancel"
        danger={confirm?.type === 'delete'}
        loading={busy}
        onConfirm={runAction}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
