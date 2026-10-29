// frontend/src/pages/hr/interviewers/InterviewerList.jsx
// Owner: Aarian
// SRS "Manage Interviewer Accounts": list, add (login details emailed), open, delete.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage, getFieldErrors } from '../../../services/api';
import { useDepartments } from '../../../services/departments';
import { Alert, Avatar, Badge, Button, Card, Checkbox, ConfirmDialog, Input, PageHeader, Select, Spinner } from '../../../components/ui';

const EMPTY = { full_name: '', email: '', department_id: '', designation: '', phone: '' };

export default function InterviewerList() {
  const { departments } = useDepartments();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null); // { name, email, password, emailSent }
  const [copied, setCopied] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchText.trim()), 350);
    return () => clearTimeout(t);
  }, [searchText]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (showDeleted) params.include_deleted = 'true';
      const { data } = await api.get('/interviewers', { params });
      setList(data.interviewers);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, showDeleted]);

  useEffect(() => {
    load();
  }, [load]);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const onCreate = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.full_name.trim()) next.full_name = 'This field is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = 'Please enter a valid email address.';
    if (!form.department_id) next.department_id = 'Please select a department.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/interviewers', { ...form, department_id: Number(form.department_id) });
      setCreated({ name: form.full_name.trim(), email: form.email.trim(), password: data.temporary_password, emailSent: data.email_sent, message: data.message });
      setCopied(false);
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (err) {
      setErrors(getFieldErrors(err));
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      const { data } = await api.delete(`/interviewers/${toDelete.user_id}`);
      setNotice(data.message);
      setToDelete(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(created.password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Interviewers"
        subtitle="Accounts for staff who only conduct interviews. They see only the interviews assigned to them."
        actions={!showForm && <Button onClick={() => { setShowForm(true); setCreated(null); setNotice(''); }}>+ Add Interviewer</Button>}
      />

      <Alert type="success">{notice}</Alert>
      <Alert type="error">{error}</Alert>

      {/* One-time result after creating an account */}
      {created && (
        <Card className="flex flex-col gap-3 border-amber bg-cream-soft p-5">
          <p className="font-semibold">{created.message}</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span><span className="text-muted">Name:</span> {created.name}</span>
            <span><span className="text-muted">Email:</span> {created.email}</span>
            <span>
              <span className="text-muted">Temporary password:</span>{' '}
              <code className="rounded bg-white px-2 py-1 font-mono font-semibold">{created.password}</code>
            </span>
            <Button variant="secondary" onClick={copyPassword}>{copied ? 'Copied ✓' : 'Copy password'}</Button>
          </div>
          <p className="text-xs text-muted">This password is shown only once. The interviewer can set their own password with "Forgot Password".</p>
        </Card>
      )}

      {/* Add form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-xl font-bold">Add interviewer</h2>
          <form onSubmit={onCreate} noValidate className="mt-4 grid gap-4 md:grid-cols-2">
            <Input label="Full name" name="full_name" value={form.full_name} onChange={onChange} error={errors.full_name} required />
            <Input label="Email" name="email" type="email" value={form.email} onChange={onChange} error={errors.email} required />
            <Select
              label="Department"
              name="department_id"
              value={form.department_id}
              onChange={onChange}
              error={errors.department_id}
              placeholder="Select department"
              options={departments.map((d) => ({ value: String(d.department_id), label: d.name }))}
              required
            />
            <Input label="Designation" name="designation" placeholder="e.g. Technical Lead" value={form.designation} onChange={onChange} error={errors.designation} />
            <Input label="Phone number" name="phone" type="tel" value={form.phone} onChange={onChange} error={errors.phone} />
            <div className="flex flex-wrap items-end gap-3 md:col-span-2">
              <Button type="submit" loading={saving}>Save and send login details</Button>
              <Button variant="secondary" onClick={() => { setShowForm(false); setErrors({}); }}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[240px] flex-1">
          <label htmlFor="interviewer-search" className="sr-only">Search interviewers</label>
          <input
            id="interviewer-search"
            type="search"
            placeholder="Search by name, email or department"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-line-strong bg-white px-3 text-sm text-brown focus:outline-none focus:ring-2 focus:ring-amber"
          />
        </div>
        <Checkbox label="Show deleted accounts" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
      </div>

      {/* List */}
      <Card className="overflow-x-auto p-0">
        {loading ? (
          <div className="flex justify-center py-16 text-rust"><Spinner label="Loading interviewers" /></div>
        ) : list.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-heading text-lg font-bold">No interviewers yet</p>
            <p className="mt-1 text-sm text-muted">Add an interviewer so they can be assigned to interviews.</p>
          </div>
        ) : (
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-cream text-left text-xs uppercase tracking-[0.06em] text-muted">
                <th scope="col" className="px-5 py-3.5 font-semibold">Name</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Department</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Designation</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Interviews</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.user_id} className="border-t border-cream-soft">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={i.full_name} src={i.profile_picture_url} size={36} />
                      <div className="min-w-0">
                        <p className="font-semibold">{i.full_name}</p>
                        <p className="truncate text-xs text-muted">{i.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{i.department}</td>
                  <td className="px-4 py-3">{i.designation || '—'}</td>
                  <td className="px-4 py-3">{i.interviews_assigned}</td>
                  <td className="px-4 py-3">
                    <Badge tone={i.status === 'ACTIVE' ? 'success' : 'danger'}>{i.status === 'ACTIVE' ? 'Active' : 'Deleted'}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1 whitespace-nowrap">
                      <Link to={`/hr/interviewers/${i.user_id}`} className="inline-flex min-h-11 items-center rounded-lg px-3 font-semibold hover:bg-cream-soft">View</Link>
                      {i.status === 'ACTIVE' && (
                        <button type="button" onClick={() => setToDelete(i)} className="min-h-11 rounded-lg px-3 font-semibold text-danger hover:bg-danger-soft">
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete interviewer"
        message={`Delete ${toDelete?.full_name}'s account? They will no longer be able to log in. Their past interviews and feedback stay in the records.`}
        confirmText="Delete"
        cancelText="Cancel"
        danger
        loading={deleting}
        onConfirm={onDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
