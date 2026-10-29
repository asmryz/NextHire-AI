// frontend/src/components/ui/Textarea.jsx
// Owner: Aarian (UI kit)
import { useId } from 'react';

export default function Textarea({ label, error, hint, required, rows = 4, className = '', ...props }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-[13px] font-semibold text-brown">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`w-full rounded-[10px] border bg-white px-3 py-2.5 text-sm text-brown focus:outline-none focus:ring-2 focus:ring-amber ${
          error ? 'border-[1.5px] border-danger' : 'border-line-strong'
        }`}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
