// frontend/src/components/ui/RadioGroup.jsx
// Owner: Aarian (UI kit)
//   <RadioGroup label="Gender" name="gender" options={['Male','Female']} value={v} onChange={setV} error={...} />
import { useId } from 'react';

export default function RadioGroup({ label, name, options = [], value, onChange, error, hint, required, disabled, inline = true }) {
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} disabled={disabled}>
      <legend className="mb-1 text-[13px] font-semibold text-brown">
        {label}
        {required && <span className="text-danger"> *</span>}
      </legend>
      <div className={`flex gap-2 ${inline ? 'flex-wrap' : 'flex-col'}`}>
        {options.map((opt) => {
          const checked = value === opt;
          return (
            <label
              key={opt}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border px-3.5 text-sm ${
                checked ? 'border-amber bg-cream-soft font-semibold' : 'border-line-strong bg-white'
              } ${disabled ? 'cursor-not-allowed opacity-70' : 'hover:border-amber'}`}
            >
              <input
                type="radio"
                name={name || id}
                value={opt}
                checked={checked}
                onChange={() => onChange?.(opt)}
                className="h-4 w-4 accent-rust"
                disabled={disabled}
              />
              {opt}
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted">{hint}</p>
      ) : null}
    </fieldset>
  );
}
