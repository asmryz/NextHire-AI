// frontend/src/pages/hr/vacancies/VacancyEditor.jsx
// Owner: Aarian
// SRS 4.2: create / edit a vacancy in 3 steps on one page
//   1. Details (title, department, location, start + end date, description)
//   2. Requirements (type, name, minimum, mandatory flag, weightage -> must total 100%)
//   3. Generic Form Mechanism: "Generate Form" builds one question per requirement,
//      HR adjusts the questions (text, type, required, order, extra questions), then Publish.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage, getFieldErrors } from '../../../services/api';
import { useDepartments } from '../../../services/departments';
import { Alert, Badge, Button, Card, Checkbox, Input, PageHeader, Select, Spinner, Textarea } from '../../../components/ui';

const REQ_TYPES = [
  { value: 'SKILL', label: 'Skill' },
  { value: 'EXPERIENCE', label: 'Experience' },
  { value: 'QUALIFICATION', label: 'Qualification' },
  { value: 'CERTIFICATION', label: 'Certification' },
];
const MIN_HINT = {
  SKILL: 'e.g. Intermediate',
  EXPERIENCE: 'Minimum years, e.g. 2',
  QUALIFICATION: 'e.g. BS Computer Science',
  CERTIFICATION: 'Optional',
};
const FIELD_TYPES = [
  { value: 'TEXT', label: 'Short text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'LIST', label: 'List (comma separated)' },
  { value: 'URL', label: 'Link (URL)' },
];
const EMPTY_DETAILS = { title: '', department_id: '', location: '', start_date: '', end_date: '', description: '' };

let keySeed = 0;
const newKey = () => `k${(keySeed += 1)}`;
const emptyRequirement = () => ({ key: newKey(), req_type: 'SKILL', name: '', min_value: '', is_mandatory: false, weightage: '' });

export default function VacancyEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const location = useLocation();
  const { departments, error: deptError } = useDepartments();

  const [vacancy, setVacancy] = useState(null);
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [requirements, setRequirements] = useState([emptyRequirement()]);
  const [fields, setFields] = useState([]);
  const [dirty, setDirty] = useState(isNew);
  const [formDirty, setFormDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [loading, setLoading] = useState(!isNew);
  const [busy, setBusy] = useState('');
  const [errors, setErrors] = useState({});
  // A message passed from the previous screen (e.g. after creating a new vacancy)
  const [message, setMessage] = useState(
    location.state?.message ? { type: 'success', text: location.state.message } : { type: '', text: '' }
  );
  const topRef = useRef(null);

  // ---------------------------------------------------------- load / hydrate
  const hydrate = (v) => {
    setVacancy(v);
    setDetails({
      title: v.title || '',
      department_id: v.department_id ? String(v.department_id) : '',
      location: v.location || '',
      start_date: v.start_date || '',
      end_date: v.end_date || '',
      description: v.description || '',
    });
    setRequirements(
      v.requirements.length
        ? v.requirements.map((r) => ({ ...r, key: newKey(), min_value: r.min_value || '', weightage: String(r.weightage) }))
        : [emptyRequirement()]
    );
    setFields(v.form_fields.map((f) => ({ ...f, key: newKey() })));
    setDirty(false);
    setFormDirty(false);
  };

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    api
      .get(`/vacancies/${id}`)
      .then(({ data }) => hydrate(data.vacancy))
      .catch((err) => setMessage({ type: 'error', text: getErrorMessage(err) }))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const show = (type, text) => {
    setMessage({ type, text });
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ---------------------------------------------------------- derived state
  const status = vacancy?.status || 'DRAFT';
  const readOnly = status === 'CLOSED' || status === 'FILLED';
  const reqLocked = readOnly || (vacancy?.applicants || 0) > 0;
  const totalWeight = useMemo(
    () => Math.round(requirements.reduce((s, r) => s + (Number(r.weightage) || 0), 0) * 100) / 100,
    [requirements]
  );
  const weightOk = Math.abs(totalWeight - 100) < 0.01;
  const reqName = (reqId) => {
    const r = vacancy?.requirements.find((x) => x.requirement_id === reqId);
    return r ? `${r.name} (${r.req_type.toLowerCase()})` : null;
  };

  // ---------------------------------------------------------- edit handlers
  const onDetail = (e) => {
    setDetails({ ...details, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
    setDirty(true);
  };
  const updateReq = (key, changes) => {
    setRequirements((list) => list.map((r) => (r.key === key ? { ...r, ...changes } : r)));
    setDirty(true);
  };
  const addReq = () => {
    setRequirements((list) => [...list, emptyRequirement()]);
    setDirty(true);
  };
  const removeReq = (key) => {
    setRequirements((list) => (list.length > 1 ? list.filter((r) => r.key !== key) : list));
    setDirty(true);
  };

  const updateField = (key, changes) => {
    setFields((list) => list.map((f) => (f.key === key ? { ...f, ...changes } : f)));
    setFormDirty(true);
  };
  const moveField = (index, dir) => {
    setFields((list) => {
      const next = [...list];
      const target = index + dir;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setFormDirty(true);
  };
  const addField = () => {
    setFields((list) => [...list, { key: newKey(), requirement_id: null, label: '', field_type: 'TEXT', is_required: false }]);
    setFormDirty(true);
  };
  const removeField = (key) => {
    setFields((list) => list.filter((f) => f.key !== key));
    setFormDirty(true);
  };

  // ---------------------------------------------------------- client checks
  const validateDetails = () => {
    const e = {};
    if (!details.title.trim()) e.title = 'Title is required';
    if (!details.department_id) e.department_id = 'Please select a department.';
    if (details.start_date && details.end_date && details.end_date < details.start_date) {
      e.end_date = 'End date must be on or after the start date.';
    }
    const reqErrors = requirements.map((r) => {
      const x = {};
      if (!r.name.trim()) x.name = 'Name is required.';
      const w = Number(r.weightage);
      if (r.weightage === '' || !Number.isFinite(w) || w < 0 || w > 100) x.weightage = '0 to 100';
      return Object.keys(x).length ? x : null;
    });
    if (reqErrors.some(Boolean)) e.requirements = reqErrors;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ---------------------------------------------------------- API actions
  // Saves details + requirements. Returns the saved vacancy or null.
  const saveDraft = async ({ quiet = false } = {}) => {
    if (!validateDetails()) {
      show('error', 'Please correct the highlighted fields.');
      return null;
    }
    const payload = {
      ...details,
      department_id: Number(details.department_id),
      start_date: details.start_date || null,
      end_date: details.end_date || null,
      requirements: requirements.map(({ req_type, name, min_value, is_mandatory, weightage }) => ({
        req_type,
        name: name.trim(),
        min_value: min_value?.trim() || null,
        is_mandatory,
        weightage: Number(weightage),
      })),
    };
    try {
      const { data } = isNew ? await api.post('/vacancies', payload) : await api.put(`/vacancies/${id}`, payload);
      hydrate(data.vacancy);
      if (!quiet) show('success', data.message);
      return data.vacancy;
    } catch (err) {
      setErrors(getFieldErrors(err));
      show('error', getErrorMessage(err));
      return null;
    }
  };

  // A brand-new vacancy gets its own URL after the first save
  const goToSaved = (vacancyId, text) => navigate(`/hr/vacancies/${vacancyId}`, { replace: true, state: { message: text } });

  const onSave = async () => {
    setBusy('save');
    const saved = await saveDraft({ quiet: isNew });
    setBusy('');
    if (saved && isNew) goToSaved(saved.vacancy_id, 'Vacancy saved as draft.');
  };

  const onGenerate = async () => {
    if (!weightOk) {
      show('error', 'Total weightage must equal 100%');
      return;
    }
    setBusy('generate');
    try {
      let current = vacancy;
      if (isNew || dirty) current = await saveDraft({ quiet: true });
      if (!current) return;
      const { data } = await api.post(`/vacancies/${current.vacancy_id}/generate-form`);
      if (isNew) {
        goToSaved(current.vacancy_id, data.message);
        return;
      }
      hydrate(data.vacancy);
      setShowPreview(false);
      show('success', data.message);
    } catch (err) {
      show('error', getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const saveForm = async ({ quiet = false } = {}) => {
    const bad = fields.findIndex((f) => !f.label.trim());
    if (bad !== -1) {
      show('error', `Question ${bad + 1} needs text.`);
      return false;
    }
    try {
      const { data } = await api.put(`/vacancies/${vacancy.vacancy_id}/form`, {
        fields: fields.map(({ requirement_id, label, field_type, is_required }) => ({ requirement_id, label: label.trim(), field_type, is_required })),
      });
      hydrate(data.vacancy);
      if (!quiet) show('success', data.message);
      return true;
    } catch (err) {
      show('error', getErrorMessage(err));
      return false;
    }
  };

  const onSaveForm = async () => {
    setBusy('form');
    await saveForm();
    setBusy('');
  };

  const onPublish = async () => {
    setBusy('publish');
    try {
      let current = vacancy;
      if (dirty) current = await saveDraft({ quiet: true });
      if (!current) return;
      if (formDirty && !(await saveForm({ quiet: true }))) return;
      const { data } = await api.post(`/vacancies/${current.vacancy_id}/publish`);
      hydrate(data.vacancy);
      show('success', data.message);
    } catch (err) {
      show('error', getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  // ---------------------------------------------------------- render
  if (loading) {
    return <div className="flex justify-center py-20 text-rust"><Spinner label="Loading vacancy" /></div>;
  }
  if (!isNew && !vacancy) {
    return (
      <div className="flex flex-col gap-4">
        <Alert type="error">{message.text || 'Vacancy not found.'}</Alert>
        <Link to="/hr/vacancies" className="font-semibold underline">Back to vacancies</Link>
      </div>
    );
  }

  return (
    <div ref={topRef} className="flex scroll-mt-6 flex-col gap-6">
      <Link to="/hr/vacancies" className="w-fit text-sm font-semibold text-muted hover:text-brown">← All vacancies</Link>

      <PageHeader
        title={isNew ? 'New vacancy' : details.title || 'Vacancy'}
        subtitle={
          isNew
            ? 'Fill in the details and requirements, then generate the application form.'
            : `${vacancy.applicants} applicant(s)${vacancy.published_at ? ' · published' : ''}`
        }
        actions={!isNew && <Badge status={status} />}
      />

      <Alert type={message.type || 'info'}>{message.text}</Alert>
      {deptError && <Alert type="error">{deptError}</Alert>}
      {readOnly && <Alert type="info">This vacancy is closed. It can be viewed but not changed.</Alert>}
      {!readOnly && reqLocked && (
        <Alert type="info">This vacancy already has applications, so its requirements and form are locked. You can still edit the details and dates.</Alert>
      )}

      {/* ---------------- 1. Details ---------------- */}
      <Card className="flex flex-col gap-5 p-6">
        <h2 className="text-xl font-bold">1. Vacancy details</h2>
        <fieldset disabled={readOnly} className="grid gap-4 md:grid-cols-2">
          <Input label="Title" name="title" value={details.title} onChange={onDetail} error={errors.title} required className="md:col-span-2" />
          <Select
            label="Department"
            name="department_id"
            value={details.department_id}
            onChange={onDetail}
            error={errors.department_id}
            placeholder="Select department"
            options={departments.map((d) => ({ value: String(d.department_id), label: d.name }))}
            required
          />
          <Input label="Location" name="location" placeholder="e.g. Karachi (on-site)" value={details.location} onChange={onDetail} error={errors.location} />
          <Input label="Start date" name="start_date" type="date" value={details.start_date} onChange={onDetail} error={errors.start_date} hint="Applications open from this date." />
          <Input label="End date" name="end_date" type="date" min={details.start_date || undefined} value={details.end_date} onChange={onDetail} error={errors.end_date} hint="Last day to apply." />
          <Textarea label="Description" name="description" rows={5} value={details.description} onChange={onDetail} className="md:col-span-2" hint="Role summary, responsibilities and benefits." />
        </fieldset>
      </Card>

      {/* ---------------- 2. Requirements ---------------- */}
      <Card className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">2. Requirements</h2>
            <p className="mt-1 text-sm text-muted">Mark must-have requirements as mandatory. Weightage of all requirements must total 100%.</p>
          </div>
          <div
            className={`rounded-full px-4 py-2 text-sm font-semibold ${weightOk ? 'bg-success-soft text-success' : 'bg-cream text-brown'}`}
            aria-live="polite"
          >
            Total weightage: {totalWeight}%{weightOk ? ' ✓' : ' (must be 100%)'}
          </div>
        </div>

        <fieldset disabled={reqLocked} className="flex flex-col gap-4">
          <legend className="sr-only">Requirements</legend>
          {requirements.map((r, i) => {
            const e = errors.requirements?.[i] || {};
            return (
              <div key={r.key} className="grid gap-3 rounded-xl border border-line bg-paper p-4 md:grid-cols-[150px_1fr_1fr_120px_auto] md:items-start">
                <Select label="Type" value={r.req_type} onChange={(ev) => updateReq(r.key, { req_type: ev.target.value })} options={REQ_TYPES} />
                <Input label="Name" placeholder="e.g. React" value={r.name} onChange={(ev) => updateReq(r.key, { name: ev.target.value })} error={e.name} />
                <Input label="Minimum" placeholder={MIN_HINT[r.req_type]} value={r.min_value} onChange={(ev) => updateReq(r.key, { min_value: ev.target.value })} error={e.min_value} />
                <Input label="Weightage %" type="number" min="0" max="100" step="1" value={r.weightage} onChange={(ev) => updateReq(r.key, { weightage: ev.target.value })} error={e.weightage} />
                <div className="flex items-center gap-2 md:pt-6">
                  <Checkbox label="Mandatory" checked={r.is_mandatory} onChange={(ev) => updateReq(r.key, { is_mandatory: ev.target.checked })} />
                  <Button variant="ghost" onClick={() => removeReq(r.key)} disabled={requirements.length === 1} aria-label={`Remove requirement ${i + 1}`}>
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
          <div>
            <Button variant="secondary" onClick={addReq}>+ Add requirement</Button>
          </div>
        </fieldset>
      </Card>

      {/* ---------------- 3. Application form ---------------- */}
      <Card className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">3. Application form</h2>
            <p className="mt-1 text-sm text-muted">
              Generated from the requirements: one question per requirement. Adjust the wording, type and order, or add your own questions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {fields.length > 0 && (
              <Button variant="secondary" onClick={() => setShowPreview((p) => !p)}>{showPreview ? 'Edit questions' : 'Preview as candidate'}</Button>
            )}
            {!reqLocked && (
              <Button onClick={onGenerate} loading={busy === 'generate'} disabled={Boolean(busy)}>
                {fields.length ? 'Regenerate form' : 'Generate form'}
              </Button>
            )}
          </div>
        </div>

        {fields.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong bg-paper px-6 py-10 text-center text-sm text-muted">
            No form yet. Add requirements (total 100%), then click <span className="font-semibold text-brown">Generate form</span>.
          </div>
        ) : showPreview ? (
          <FormPreview fields={fields} title={details.title} />
        ) : (
          <fieldset disabled={reqLocked} className="flex flex-col gap-3">
            <legend className="sr-only">Form questions</legend>
            {fields.map((f, i) => (
              <div key={f.key} className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${f.requirement_id ? 'bg-cream text-brown' : 'bg-cream-soft text-muted'}`}>
                    Q{i + 1} · {f.requirement_id ? `Linked to ${reqName(f.requirement_id) || 'requirement'}` : 'Custom question'}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" onClick={() => moveField(i, -1)} disabled={i === 0} aria-label={`Move question ${i + 1} up`}>↑</Button>
                    <Button variant="ghost" onClick={() => moveField(i, 1)} disabled={i === fields.length - 1} aria-label={`Move question ${i + 1} down`}>↓</Button>
                    {!f.requirement_id && (
                      <Button variant="ghost" className="text-danger" onClick={() => removeField(f.key)}>Remove</Button>
                    )}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_200px_auto] md:items-end">
                  <Input label="Question" value={f.label} maxLength={150} onChange={(e) => updateField(f.key, { label: e.target.value })} />
                  <Select label="Answer type" value={f.field_type} onChange={(e) => updateField(f.key, { field_type: e.target.value })} options={FIELD_TYPES} />
                  <Checkbox label="Required" checked={f.is_required} onChange={(e) => updateField(f.key, { is_required: e.target.checked })} />
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={addField}>+ Add custom question</Button>
              <Button variant="secondary" onClick={onSaveForm} loading={busy === 'form'} disabled={!formDirty || Boolean(busy)}>Save form changes</Button>
            </div>
          </fieldset>
        )}
      </Card>

      {/* ---------------- Action bar ---------------- */}
      {!readOnly && (
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-paper/95 px-4 py-4 sm:-mx-8 sm:px-8">
          {(dirty || formDirty) && <span className="mr-auto text-sm text-muted">You have unsaved changes.</span>}
          <Button variant="secondary" onClick={onSave} loading={busy === 'save'} disabled={Boolean(busy) || (!dirty && !isNew)}>
            Save draft
          </Button>
          {status !== 'OPEN' && (
            <Button variant="important" onClick={onPublish} loading={busy === 'publish'} disabled={Boolean(busy) || isNew || fields.length === 0}>
              Publish
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// How the candidate will see the form (read-only preview)
function FormPreview({ fields, title }) {
  const inputType = { TEXT: 'text', NUMBER: 'number', DATE: 'date', LIST: 'text', URL: 'url' };
  return (
    <div className="rounded-xl border border-line bg-paper p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Candidate view</p>
      <h3 className="mt-1 text-lg font-bold">Apply for {title || 'this position'}</h3>
      <form className="mt-5 grid gap-4" onSubmit={(e) => e.preventDefault()}>
        {fields.map((f) => (
          <Input
            key={f.key}
            label={f.label || 'Untitled question'}
            type={inputType[f.field_type] || 'text'}
            required={f.is_required}
            hint={f.field_type === 'LIST' ? 'Separate items with commas.' : undefined}
            disabled
          />
        ))}
        <Input label="Portfolio / context link (optional)" type="url" hint="Not used for scoring." disabled />
        <div>
          <Button disabled>Submit application</Button>
        </div>
      </form>
    </div>
  );
}
