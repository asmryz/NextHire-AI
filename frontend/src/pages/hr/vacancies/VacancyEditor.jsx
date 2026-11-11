// frontend/src/pages/hr/vacancies/VacancyEditor.jsx
// Owner: Aarian
// SRS 4.2: create / edit a vacancy in 3 steps on one page
//   1. Details (title, department, location, start + end date, description)
//   2. Requirements (type, name, minimum, mandatory flag, weightage -> must total 100%)
//   3. Generic Form Mechanism: "Generate Form" builds a complete application form:
//      standard sections (personal, education, experience, skills) + questions for every
//      requirement (level / years / details). HR adjusts it, then Publish.
// Lock rule (BR-21): once a vacancy has applications, everything is locked except the END DATE
// (HR can still extend the deadline). The backend enforces the same rule.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage, getFieldErrors } from '../../../services/api';
import { useDepartments } from '../../../services/departments';
import { Alert, Badge, Button, Card, Checkbox, Input, PageHeader, Select, Spinner, Textarea } from '../../../components/ui';
import FormFieldInput, { groupBySection, SECTION_LABELS } from '../../../components/FormFieldInput';

const REQ_TYPES = [
  { value: 'SKILL', label: 'Skill' },
  { value: 'EXPERIENCE', label: 'Experience' },
  { value: 'QUALIFICATION', label: 'Qualification' },
  { value: 'CERTIFICATION', label: 'Certification' },
];

const MIN_LEVELS = {
  SKILL: ['Entry level', 'Medium', 'Expert'],
  EXPERIENCE: ['Entry level (0-2 years)', 'Medium (2-5 years)', 'Expert (5+ years)'],
  QUALIFICATION: ['Entry level', 'Medium', 'Expert'],
  CERTIFICATION: [],
};
// An older vacancy may have a free-text minimum: show it too, so editing details does not change it
const minOptions = (type, current) => [
  ...(MIN_LEVELS[type] || []).map((m) => ({ value: m, label: m })),
  ...(current && !(MIN_LEVELS[type] || []).includes(current) ? [{ value: current, label: `${current} (old value)` }] : []),
];
const validMin = (type, value) => ((MIN_LEVELS[type] || []).includes(value) ? value : '');
const FIELD_TYPES = [
  { value: 'TEXT', label: 'Short text' },
  { value: 'TEXTAREA', label: 'Long text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'RADIO', label: 'Choice (radio buttons)' },
  { value: 'SELECT', label: 'Dropdown' },
  { value: 'LIST', label: 'List (comma separated)' },
  { value: 'DATE', label: 'Date' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'URL', label: 'Link (URL)' },
];
const CHOICE = ['RADIO', 'SELECT'];
const CORE_KEYS = ['full_name', 'email', 'phone', 'cnic']; // cannot be removed
const EMPTY_DETAILS = { title: '', department_id: '', location: '', start_date: '', end_date: '', description: '' };

let keySeed = 0;
const newKey = () => `k${(keySeed += 1)}`;
const emptyRequirement = () => ({ key: newKey(), req_type: 'SKILL', name: '', min_value: '', is_mandatory: false, weightage: '' });

// 'YYYY-MM-DD' -> '15 Nov 2026'
const fmtDate = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set';

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
    setFields(v.form_fields.map((f) => ({ ...f, key: newKey(), optionsText: Array.isArray(f.options) ? f.options.join(', ') : '' })));
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

  // Only errors jump to the top (so HR sees what to fix); success messages do not move the page
  const show = (type, text) => {
    setMessage({ type, text });
    if (type === 'error') topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ---------------------------------------------------------- derived state
  const status = vacancy?.status || 'DRAFT';
  const readOnly = status === 'CLOSED' || status === 'FILLED';
  const hasApplicants = (vacancy?.applicants || 0) > 0;
  // Locked = has applications: details, requirements and form are frozen, only the end date stays editable
  const locked = readOnly || hasApplicants;
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
    // Safety net: on a locked vacancy only the end date may change
    if (locked && e.target.name !== 'end_date') return;
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
    setFields((list) => [
      ...list,
      { key: newKey(), requirement_id: null, field_key: null, is_standard: false, section: 'CLOSING', label: '', field_type: 'TEXT', is_required: false, options: null, optionsText: '', help_text: null },
    ]);
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
    if (locked && !details.end_date) e.end_date = 'Please enter a valid date.';
    if (details.start_date && details.end_date && details.end_date < details.start_date) {
      e.end_date = 'End date must be on or after the start date.';
    }
    if (!locked) {
      const reqErrors = requirements.map((r) => {
        const x = {};
        if (!r.name.trim()) x.name = 'Name is required.';
        const w = Number(r.weightage);
        if (r.weightage === '' || !Number.isFinite(w) || w < 0 || w > 100) x.weightage = '0 to 100';
        return Object.keys(x).length ? x : null;
      });
      if (reqErrors.some(Boolean)) e.requirements = reqErrors;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ---------------------------------------------------------- API actions
  // Saves details + requirements (or only the end date when locked). Returns the saved vacancy or null.
  const saveDraft = async ({ quiet = false } = {}) => {
    if (!validateDetails()) {
      show('error', 'Please correct the highlighted fields.');
      return null;
    }
    const payload = locked
      ? { end_date: details.end_date }
      : {
          ...details,
          department_id: Number(details.department_id),
          start_date: details.start_date || null,
          end_date: details.end_date || null,
          requirements: requirements.map(({ req_type, name, min_value, is_mandatory, weightage }) => ({
            req_type,
            name: name.trim(),
            min_value: req_type === 'CERTIFICATION' ? null : min_value || null,
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
    const toOptions = (f) => (f.optionsText || '').split(',').map((o) => o.trim()).filter(Boolean);
    const badChoice = fields.findIndex((f) => CHOICE.includes(f.field_type) && toOptions(f).length < 2);
    if (badChoice !== -1) {
      show('error', `Question ${badChoice + 1} needs at least 2 options (comma separated).`);
      return false;
    }
    const bad = fields.findIndex((f) => !f.label.trim());
    if (bad !== -1) {
      show('error', `Question ${bad + 1} needs text.`);
      return false;
    }
    try {
      const { data } = await api.put(`/vacancies/${vacancy.vacancy_id}/form`, {
        fields: fields.map((f) => ({
          requirement_id: f.requirement_id,
          field_key: f.field_key,
          is_standard: f.is_standard,
          section: f.section,
          label: f.label.trim(),
          field_type: f.field_type,
          is_required: f.is_required,
          options: CHOICE.includes(f.field_type) ? toOptions(f) : null,
          help_text: f.help_text,
        })),
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
        <Link to="/hr/vacancies" className="font-medium underline">Back to vacancies</Link>
      </div>
    );
  }

  const saveLabel = hasApplicants && !readOnly ? 'Save end date' : status === 'DRAFT' ? 'Save draft' : 'Save changes';
  const canPublish = status === 'DRAFT' && !readOnly;
  const checklist = [
    { label: 'Title and department', ok: Boolean(details.title.trim() && details.department_id) },
    { label: 'Start and end date', ok: Boolean(details.start_date && details.end_date) },
    { label: 'Weightage totals 100%', ok: weightOk },
    { label: 'Application form generated', ok: fields.length > 0 },
  ];

  const actionButtons = (stacked) => (
    <>
      <Button
        variant="secondary"
        className={stacked ? 'w-full' : ''}
        onClick={onSave}
        loading={busy === 'save'}
        disabled={Boolean(busy) || (!dirty && !isNew)}
      >
        {saveLabel}
      </Button>
      {canPublish && (
        <Button
          variant="important"
          className={stacked ? 'w-full' : ''}
          onClick={onPublish}
          loading={busy === 'publish'}
          disabled={Boolean(busy) || isNew || fields.length === 0}
        >
          Publish
        </Button>
      )}
    </>
  );

  return (
    <div ref={topRef} className="mx-auto flex w-full min-w-0 max-w-[1200px] scroll-mt-6 flex-col gap-5">
      {/* <Link to="/hr/vacancies" className="w-fit text-sm text-muted transition-colors hover:text-brown">← All vacancies</Link> */}
      <button
  type="button"
  onClick={() => navigate('/hr/vacancies')}
  className="inline-flex h-9 w-fit items-center gap-2 rounded-[10px] border border-line-strong bg-white px-3.5 text-sm font-medium text-brown transition-colors hover:border-amber hover:bg-cream-soft"
>
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
  All Vacancies
</button>

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

      {readOnly && (
        <LockNotice title="This vacancy is closed">It can be viewed but not changed.</LockNotice>
      )}
      {!readOnly && hasApplicants && (
        <LockNotice title="This vacancy is locked">
          Candidates have already applied, so the details, requirements and form cannot change.
        </LockNotice>
      )}

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        {/* ================= main column ================= */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* ---------------- 1. Details ---------------- */}
          <Section
            step="1"
            title="Vacancy details"
            subtitle={locked ? 'Locked. Only the end date can be changed.' : 'Basic information candidates see first.'}
            locked={locked}
          >
            <div className="grid min-w-0 gap-x-4 gap-y-3 sm:grid-cols-2">
              <Input label="Title" name="title" value={details.title} onChange={onDetail} error={errors.title} required disabled={locked} className="sm:col-span-2" />
              <Select
                label="Department"
                name="department_id"
                value={details.department_id}
                onChange={onDetail}
                error={errors.department_id}
                placeholder="Select department"
                options={departments.map((d) => ({ value: String(d.department_id), label: d.name }))}
                required
                disabled={locked}
              />
              <Input label="Location" name="location" placeholder="e.g. Karachi (on-site)" value={details.location} onChange={onDetail} error={errors.location} disabled={locked} />
              <Input label="Start date" name="start_date" type="date" value={details.start_date} onChange={onDetail} error={errors.start_date} hint="Applications open from this date." disabled={locked} />
              <Input
                label="End date"
                name="end_date"
                type="date"
                min={details.start_date || undefined}
                value={details.end_date}
                onChange={onDetail}
                error={errors.end_date}
                hint={hasApplicants && !readOnly ? 'Still editable: extend the deadline if needed.' : 'Last day to apply.'}
                disabled={readOnly}
                className={hasApplicants && !readOnly ? 'rounded-xl bg-cream-soft p-2 ring-1 ring-amber/40' : ''}
              />
              <Textarea label="Description" name="description" rows={4} value={details.description} onChange={onDetail} disabled={locked} className="sm:col-span-2" hint="Role summary, responsibilities and benefits." />
            </div>
          </Section>

          {/* ---------------- 2. Requirements ---------------- */}
          <Section
            step="2"
            title="Requirements"
            subtitle="Mark must-haves as mandatory. All weightages must total 100%."
            locked={locked}
            aside={
              <span
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${weightOk ? 'bg-success-soft text-success' : 'bg-cream text-brown'}`}
                aria-live="polite"
              >
                {totalWeight}% {weightOk ? '✓' : 'of 100%'}
              </span>
            }
          >
            <WeightBar value={totalWeight} ok={weightOk} />

            <fieldset disabled={locked} className="flex min-w-0 flex-col gap-3">
              <legend className="sr-only">Requirements</legend>
              {requirements.map((r, i) => {
                const e = errors.requirements?.[i] || {};
                return (
                  <div
                    key={r.key}
                    className="grid min-w-0 gap-3 rounded-xl border border-line bg-paper p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)_110px_auto] xl:items-start"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted sm:col-span-2 xl:hidden">Requirement {i + 1}</p>
                    <Select label="Type" value={r.req_type} onChange={(ev) => updateReq(r.key, { req_type: ev.target.value, min_value: validMin(ev.target.value, r.min_value) })} options={REQ_TYPES} />
                    <Input
                      label="Name"
                      placeholder={r.req_type === 'CERTIFICATION' ? 'e.g. AWS Cloud Practitioner' : r.req_type === 'QUALIFICATION' ? 'e.g. BS Computer Science' : 'e.g. React'}
                      value={r.name}
                      onChange={(ev) => updateReq(r.key, { name: ev.target.value })}
                      error={e.name}
                      className={r.req_type === 'CERTIFICATION' ? 'xl:col-span-2' : ''}
                    />
                    {r.req_type !== 'CERTIFICATION' && (
                      <Select
                        label="Minimum"
                        placeholder="Any level"
                        options={minOptions(r.req_type, r.min_value)}
                        value={r.min_value}
                        onChange={(ev) => updateReq(r.key, { min_value: ev.target.value })}
                        error={e.min_value}
                      />
                    )}
                    <Input label="Weightage %" type="number" min="0" max="100" step="1" value={r.weightage} onChange={(ev) => updateReq(r.key, { weightage: ev.target.value })} error={e.weightage} />
                    <div className="flex items-center justify-between gap-2 sm:col-span-2 xl:col-span-1 xl:justify-start xl:pt-7">
                      <Checkbox label="Mandatory" checked={r.is_mandatory} onChange={(ev) => updateReq(r.key, { is_mandatory: ev.target.checked })} />
                      {!locked && (
                        <Button variant="ghost" onClick={() => removeReq(r.key)} disabled={requirements.length === 1} aria-label={`Remove requirement ${i + 1}`}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {!locked && (
                <div>
                  <Button variant="secondary" onClick={addReq}>+ Add requirement</Button>
                </div>
              )}
            </fieldset>
          </Section>

          {/* ---------------- 3. Application form ---------------- */}
          <Section
            step="3"
            title="Application form"
            subtitle="Standard sections plus questions for each requirement. Edit wording, answer type and order, or add your own questions."
            locked={locked}
            aside={
              <div className="flex flex-wrap gap-2">
                {fields.length > 0 && (
                  <Button variant="secondary" onClick={() => setShowPreview((p) => !p)}>{showPreview ? 'Edit questions' : 'Preview as candidate'}</Button>
                )}
                {!locked && (
                  <Button onClick={onGenerate} loading={busy === 'generate'} disabled={Boolean(busy)}>
                    {fields.length ? 'Regenerate form' : 'Generate form'}
                  </Button>
                )}
              </div>
            }
          >
            {fields.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line-strong bg-paper px-6 py-10 text-center text-sm text-muted">
                No form yet. Add requirements (total 100%), then click <span className="font-semibold text-brown">Generate form</span>.
              </div>
            ) : showPreview ? (
              <FormPreview fields={fields} title={details.title} />
            ) : (
              <fieldset disabled={locked} className="flex min-w-0 flex-col gap-2.5">
                <legend className="sr-only">Form questions</legend>
                {fields.map((f, i) => {
                  const showSection = i === 0 || fields[i - 1].section !== f.section;
                  const canRemove = !locked && !CORE_KEYS.includes(f.field_key);
                  return (
                    <div key={f.key} className="flex min-w-0 flex-col gap-2">
                      {showSection && (
                        <h3 className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-rust">{SECTION_LABELS[f.section] || f.section}</h3>
                      )}
                      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-white p-3 sm:p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className={`max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-medium ${f.requirement_id ? 'bg-cream text-brown' : 'bg-cream-soft text-muted'}`}>
                            Q{i + 1} · {f.requirement_id ? `Linked to ${reqName(f.requirement_id) || 'requirement'}` : f.is_standard ? 'Standard question' : 'Custom question'}
                          </span>
                          {!locked && (
                            <div className="flex gap-1">
                              <Button variant="ghost" onClick={() => moveField(i, -1)} disabled={i === 0} aria-label={`Move question ${i + 1} up`}>↑</Button>
                              <Button variant="ghost" onClick={() => moveField(i, 1)} disabled={i === fields.length - 1} aria-label={`Move question ${i + 1} down`}>↓</Button>
                              {canRemove && (
                                <Button variant="ghost" className="text-danger" onClick={() => removeField(f.key)} aria-label={`Remove question ${i + 1}`}>Remove</Button>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_200px] xl:grid-cols-[minmax(0,1fr)_200px_auto] xl:items-end">
                          <Input label="Question" value={f.label} maxLength={150} onChange={(e) => updateField(f.key, { label: e.target.value })} />
                          <Select label="Answer type" value={f.field_type} onChange={(e) => updateField(f.key, { field_type: e.target.value })} options={FIELD_TYPES} />
                          <div className="sm:col-span-2 xl:col-span-1 xl:pb-2">
                            <Checkbox label="Required" checked={f.is_required} onChange={(e) => updateField(f.key, { is_required: e.target.checked })} />
                          </div>
                        </div>
                        {CHOICE.includes(f.field_type) && (
                          <Input
                            label="Options (comma separated)"
                            placeholder="e.g. Beginner, Intermediate, Expert"
                            value={f.optionsText || ''}
                            onChange={(e) => updateField(f.key, { optionsText: e.target.value })}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
                {!locked && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={addField}>+ Add custom question</Button>
                    <Button variant="secondary" onClick={onSaveForm} loading={busy === 'form'} disabled={!formDirty || Boolean(busy)}>Save form changes</Button>
                  </div>
                )}
              </fieldset>
            )}
          </Section>
        </div>

        {/* ================= side panel (summary + actions) ================= */}
        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
          <Card className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-brown">Summary</h2>
              {!isNew && <Badge status={status} />}
            </div>

            <dl className="grid grid-cols-2 gap-3">
              <Fact label="Applicants" value={isNew ? '0' : String(vacancy.applicants)} />
              <Fact label="Questions" value={String(fields.length)} />
              <Fact label="Opens" value={fmtDate(details.start_date)} />
              <Fact label="Closes" value={fmtDate(details.end_date)} highlight={hasApplicants && !readOnly} />
            </dl>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-muted">Weightage</span>
                <span className={`font-semibold ${weightOk ? 'text-success' : 'text-brown'}`}>{totalWeight}%</span>
              </div>
              <WeightBar value={totalWeight} ok={weightOk} />
            </div>

            {status === 'DRAFT' && !hasApplicants && (
              <div className="border-t border-line pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Ready to publish</p>
                <ul className="flex flex-col gap-2">
                  {checklist.map((c) => (
                    <li key={c.label} className="flex items-center gap-2.5 text-sm">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${c.ok ? 'bg-success text-white' : 'border border-line-strong bg-white'}`}
                        aria-hidden="true"
                      >
                        {c.ok && <CheckIcon />}
                      </span>
                      <span className={c.ok ? 'text-brown' : 'text-muted'}>{c.label}</span>
                      <span className="sr-only">{c.ok ? '(done)' : '(not done)'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {locked && (
              <div className="flex items-start gap-2.5 rounded-xl bg-cream-soft p-3 text-sm text-brown">
                <LockIcon className="mt-0.5 shrink-0" />
                <span>{readOnly ? 'Closed vacancies are read-only.' : 'Locked after the first application. Only the end date can change.'}</span>
              </div>
            )}

            {!readOnly && (
              <div className="hidden flex-col gap-2 border-t border-line pt-4 lg:flex">
                {(dirty || formDirty) && <p className="text-sm italic text-muted">You have unsaved changes.</p>}
                {actionButtons(true)}
              </div>
            )}
          </Card>
        </aside>
      </div>

      {/* ---------------- Action bar (phones and tablets) ---------------- */}
      {!readOnly && (
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
          {(dirty || formDirty) && <span className="mr-auto text-sm italic text-muted">You have unsaved changes.</span>}
          {actionButtons(false)}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ small pieces

function Section({ step, title, subtitle, locked, aside, children }) {
  return (
    <Card className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brown text-xs font-semibold text-cream">{step}</span>
          <div className="min-w-0">
            <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold text-brown">
              {title}
              {locked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-xs font-medium text-brown">
                  <LockIcon /> Locked
                </span>
              )}
            </h2>
            {subtitle && <p className="mt-0.5 max-w-2xl text-sm italic text-muted">{subtitle}</p>}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </Card>
  );
}

function LockNotice({ title, children }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber/50 bg-cream-soft p-4 sm:p-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber text-brown">
        <LockIcon />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-brown">{title}</p>
        <p className="mt-0.5 text-sm text-brown/80">{children}</p>
      </div>
    </div>
  );
}

function WeightBar({ value, ok }) {
  const over = value > 100;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-cream" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(value, 100)} aria-label="Total weightage">
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${ok ? 'bg-success' : over ? 'bg-danger' : 'bg-rust'}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function Fact({ label, value, highlight }) {
  return (
    <div className={`min-w-0 rounded-xl p-3 ${highlight ? 'bg-cream ring-1 ring-amber/50' : 'bg-paper'}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-brown">{value}</dd>
    </div>
  );
}

function LockIcon({ className = '' }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

// How the candidate will see the form (read-only preview, grouped by section)
function FormPreview({ fields, title }) {
  const groups = groupBySection(
    fields.map((f) => ({ ...f, options: CHOICE.includes(f.field_type) ? (f.optionsText || '').split(',').map((o) => o.trim()).filter(Boolean) : null }))
  );
  return (
    <div className="rounded-xl border border-line bg-paper p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Candidate view</p>
      <h3 className="mt-1 text-lg font-semibold">Apply for {title || 'this position'}</h3>
      <form className="mt-5 flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        {groups.map((g, gi) => (
          <section key={`${g.section}-${gi}`} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-4 sm:p-5">
            <h4 className="text-base font-semibold">{g.label}</h4>
            {g.fields.map((f) => (
              <FormFieldInput key={f.key} field={f} disabled />
            ))}
          </section>
        ))}
        <Input label="Portfolio / context link (optional)" type="url" hint="Not used for scoring." disabled />
        <div>
          <Button disabled>Submit application</Button>
        </div>
      </form>
    </div>
  );
}