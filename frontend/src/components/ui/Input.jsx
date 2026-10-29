// frontend/src/components/ui/Input.jsx
// Owner: Aarian (UI kit)
//   <Input label="Email" name="email" value={...} onChange={...} error={errors.email} />
// Works for type text, email, password, number, date, url, tel.
import { useId, useState } from 'react';

export default function Input({ label, error, hint, type = 'text', className = '', required, ...props }) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-[13px] font-semibold text-brown">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`h-11 w-full rounded-[10px] border bg-white px-3 text-sm text-brown placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-amber ${
            error ? 'border-[1.5px] border-danger' : 'border-line-strong'
          } ${isPassword ? 'pr-16' : ''}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 min-w-14 px-3 text-xs font-semibold text-muted hover:text-brown"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
