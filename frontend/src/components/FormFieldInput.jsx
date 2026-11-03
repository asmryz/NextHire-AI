// frontend/src/components/FormFieldInput.jsx
// Owner: Aarian (used by the HR form preview and Shivani's Apply page)
// Draws one application-form question in the right control for its type.
//   <FormFieldInput field={f} value={v} onChange={(val) => ...} error={...} />
import { Input, RadioGroup, Select, Textarea } from './ui';

export const SECTION_LABELS = {
  PERSONAL: 'Personal details',
  EDUCATION: 'Education',
  EXPERIENCE: 'Work experience',
  SKILLS: 'Skills',
  ROLE: 'Role requirements',
  CLOSING: 'Anything else',
};
export const SECTION_ORDER = ['PERSONAL', 'EDUCATION', 'EXPERIENCE', 'SKILLS', 'ROLE', 'CLOSING'];

// [{ section, label, fields: [...] }] keeping the form's own order
export function groupBySection(fields) {
  const groups = [];
  for (const f of fields) {
    const key = f.section || 'ROLE';
    let g = groups[groups.length - 1];
    if (!g || g.section !== key) {
      g = { section: key, label: SECTION_LABELS[key] || key, fields: [] };
      groups.push(g);
    }
    g.fields.push(f);
  }
  return groups;
}

const INPUT_TYPE = { TEXT: 'text', NUMBER: 'number', DATE: 'date', LIST: 'text', URL: 'url', EMAIL: 'email', PHONE: 'tel' };

// Types CNIC as XXXXX-XXXXXXX-X
const formatCnic = (value) => {
  const d = String(value).replace(/\D/g, '').slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
};

export default function FormFieldInput({ field: f, value = '', onChange, error, disabled = false, readOnly = false }) {
  const label = f.label || 'Untitled question';
  const options = Array.isArray(f.options) ? f.options : [];
  const hint = f.help_text || (f.field_type === 'LIST' ? 'Separate items with commas.' : undefined);

  if (f.field_type === 'RADIO') {
    return (
      <RadioGroup label={label} options={options} value={value} onChange={onChange} error={error} hint={hint} required={f.is_required} disabled={disabled || readOnly} />
    );
  }
  if (f.field_type === 'SELECT') {
    return (
      <Select
        label={label}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="Select an option"
        options={options.map((o) => ({ value: o, label: o }))}
        error={error}
        required={f.is_required}
        disabled={disabled || readOnly}
      />
    );
  }
  if (f.field_type === 'TEXTAREA') {
    return (
      <Textarea label={label} rows={3} maxLength={2000} value={value} onChange={(e) => onChange?.(e.target.value)} error={error} hint={hint} required={f.is_required} disabled={disabled} readOnly={readOnly} />
    );
  }
  const isCnic = f.field_key === 'cnic';
  return (
    <Input
      label={label}
      type={INPUT_TYPE[f.field_type] || 'text'}
      inputMode={isCnic ? 'numeric' : undefined}
      placeholder={isCnic ? 'XXXXX-XXXXXXX-X' : f.field_type === 'URL' ? 'https://' : undefined}
      min={f.field_type === 'NUMBER' ? '0' : undefined}
      step={f.field_type === 'NUMBER' ? 'any' : undefined}
      value={value}
      onChange={(e) => onChange?.(isCnic ? formatCnic(e.target.value) : e.target.value)}
      error={error}
      hint={hint}
      required={f.is_required}
      disabled={disabled}
      readOnly={readOnly}
    />
  );
}
