// frontend/src/pages/hr/vacancies/VacancyList.jsx
// Owner: Aarian
// SRS 4.2 (REQ-14, REQ-15): list vacancies with status, search, filter by department,
// edit, close, delete (only without applications), pagination.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../../services/api';
import { useDepartments } from '../../../services/departments';
import { Alert, Badge, Button, Card, ConfirmDialog, PageHeader, Select, Spinner } from '../../../components/ui';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
];

const formatDate = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vacancies"
        subtitle="Create positions, set requirements and publish the application form."
        actions={<Button onClick={() => navigate('/hr/vacancies/new')}>+ New Vacancy</Button>}
      />

      <Alert type="success">{notice}</Alert>
      <Alert type="error">{error}</Alert>

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vacancy-search" className="sr-only">Search vacancies</label>
          <input
            id="vacancy-search"
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
          name="department_id"
          value={filters.department_id}
          onChange={onFilter}
          placeholder="All departments"
          options={departments.map((d) => ({ value: d.department_id, label: d.name }))}
        />
        <Select label="Status" hideLabel name="status" value={filters.status} onChange={onFilter} placeholder="All statuses" options={STATUS_OPTIONS} />
      </div>

      {/* Table */}
      <Card className="overflow-x-auto p-0">
        {loading ? (
          <div className="flex justify-center py-16 text-rust"><Spinner label="Loading vacancies" /></div>
        ) : vacancies.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="font-heading text-lg font-bold">{hasFilters ? 'No vacancies match your filters' : 'No vacancies yet'}</p>
            <p className="text-sm text-muted">{hasFilters ? 'Try a different search or clear the filters.' : 'Create your first vacancy to start receiving applications.'}</p>
            {hasFilters ? (
              <Button variant="secondary" onClick={() => { setSearchText(''); setFilters({ search: '', department_id: '', status: '' }); }}>Clear filters</Button>
            ) : (
              <Button onClick={() => navigate('/hr/vacancies/new')}>+ New Vacancy</Button>
            )}
          </div>
        ) : (
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-cream text-left text-xs uppercase tracking-[0.06em] text-muted">
                <th scope="col" className="px-5 py-3.5 font-semibold">Position</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Department</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Applicants</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Start date</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">End date</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vacancies.map((v) => {
                const canEdit = v.status === 'DRAFT' || v.status === 'OPEN';
                const canDelete = v.applicants === 0;
                return (
                  <tr key={v.vacancy_id} className="border-t border-cream-soft">
                    <td className="px-5 py-3.5 font-semibold">
                      <Link to={`/hr/vacancies/${v.vacancy_id}`} className="hover:text-rust hover:underline">{v.title}</Link>
                      {v.location && <span className="block text-xs font-normal text-muted">{v.location}</span>}
                    </td>
                    <td className="px-4 py-3.5">{v.department}</td>
                    <td className="px-4 py-3.5">{v.applicants}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{formatDate(v.start_date)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{formatDate(v.end_date)}</td>
                    <td className="px-4 py-3.5"><Badge status={v.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1 whitespace-nowrap">
                        <Link to={`/hr/vacancies/${v.vacancy_id}`} className="inline-flex min-h-11 items-center rounded-lg px-3 font-semibold hover:bg-cream-soft">
                          {canEdit ? 'Edit' : 'View'}
                        </Link>
                        {canEdit && (
                          <button type="button" onClick={() => setConfirm({ type: 'close', vacancy: v })} className="min-h-11 rounded-lg px-3 font-semibold hover:bg-cream-soft">
                            Close
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setConfirm({ type: 'delete', vacancy: v })}
                          disabled={!canDelete}
                          title={canDelete ? undefined : 'Has applications: close it instead'}
                          className="min-h-11 rounded-lg px-3 font-semibold text-danger hover:bg-danger-soft disabled:cursor-not-allowed disabled:text-muted disabled:opacity-60 disabled:hover:bg-transparent"
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
        )}
      </Card>

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
