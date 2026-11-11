
import { useEffect, useRef, useState } from 'react';
import api, { getErrorMessage, getFieldErrors } from '../../../services/api';
import { useDepartments } from '../../../services/departments';
import { Alert, Button, Input, Select } from '../../../components/ui';

const EMPTY = { employee_name: '', employee_email: '', employee_phone: '', employee_department: '', employee_position: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(f) {
  const e = {};
  if (!f.employee_name.trim()) e.employee_name = 'This field is required.';
  if (!f.employee_email.trim()) e.employee_email = 'This field is required.';
  else if (!EMAIL_RE.test(f.employee_email.trim())) e.employee_email = 'Please enter a valid email address.';
  if (!f.employee_phone) e.employee_phone = 'This field is required.';
  else if (!/^03\d{9}$/.test(f.employee_phone)) e.employee_phone = 'Enter an 11-digit mobile number starting with 03.';
  if (!f.employee_department.trim()) e.employee_department = 'This field is required.';
  if (!f.employee_position.trim()) e.employee_position = 'This field is required.';
  return e;
}

export default function ReferralDialog({ open, applicationId, referral, onClose, onSaved }) {
  const ref = useRef(null);
  const { departments } = useDepartments();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      setForm(referral ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, referral[k] || ''])) : EMPTY);
      setErrors({});
      setServerError('');
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) dialog.close();
  }, [open, referral]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === 'employee_phone' ? value.replace(/\D/g, '').slice(0, 11) : value }));
    setErrors((x) => ({ ...x, [name]: '' }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    setServerError('');
    try {
      const { data } = await api.put(`/inbox/${applicationId}/referral`, form);
      onSaved(data.message);
    } catch (err) {
      setErrors(getFieldErrors(err));
      setServerError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="referral-title"
      className="m-auto w-[min(94vw,520px)] rounded-2xl border border-line bg-white p-0 text-brown backdrop:bg-brown/40"
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 p-5" style={{ '--label-size': '14px' }}>
        <div>
          <h2 id="referral-title" className="text-lg font-semibold">Employee referral</h2>
          <p className="mt-1 text-sm text-muted">Details of the employee who referred this candidate (Ref No. {applicationId}).</p>
        </div>

        <Alert type="error">{serverError}</Alert>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input className="sm:col-span-2" label="Employee name" name="employee_name" maxLength={100}
            value={form.employee_name} onChange={onChange} error={errors.employee_name} required />
          <Input label="Email" name="employee_email" type="email" maxLength={255}
            value={form.employee_email} onChange={onChange} error={errors.employee_email} required />
          <Input label="Phone number" name="employee_phone" type="tel" inputMode="numeric" placeholder="03XXXXXXXXX" maxLength={11}
            value={form.employee_phone} onChange={onChange} error={errors.employee_phone} required />
          <Select label="Department" name="employee_department" placeholder="Select department"
            options={[
              ...departments.map((d) => ({ value: d.name, label: d.name })),
              // keep an older saved value that is not in the list any more
              ...(form.employee_department && !departments.some((d) => d.name === form.employee_department)
                ? [{ value: form.employee_department, label: form.employee_department }] : []),
            ]}
            value={form.employee_department} onChange={onChange} error={errors.employee_department} required />
          <Input label="Designation" name="employee_position" placeholder="e.g. Senior Developer" maxLength={100}
            value={form.employee_position} onChange={onChange} error={errors.employee_position} required />
        </div>

        {referral?.marked_by && (
          <p className="text-xs text-muted">Last saved by {referral.marked_by}.</p>
        )}

        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving}>{referral ? 'Save changes' : 'Save referral'}</Button>
        </div>
      </form>
    </dialog>
  );
}
