// frontend/src/components/ui/Select.jsx
// Owner: Aarian (UI kit)
//   <Select label="Department" value={id} onChange={...} error={...}
//     options={[{ value: 1, label: 'Engineering' }]} placeholder="Select department" />
import { useId } from 'react';

export default function Select({ label, error, options = [], placeholder, required, className = '', hideLabel = false, ...props }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-[13px] font-semibold text-brown'}>
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <select
        id={id}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`h-11 w-full rounded-[10px] border bg-white px-3 text-sm text-brown focus:outline-none focus:ring-2 focus:ring-amber ${
          error ? 'border-[1.5px] border-danger' : 'border-line-strong'
        }`}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p id={`${id}-error`} className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}
