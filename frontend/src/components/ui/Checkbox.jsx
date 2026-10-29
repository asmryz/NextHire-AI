// frontend/src/components/ui/Checkbox.jsx
// Owner: Aarian (UI kit)
//   <Checkbox label="Mandatory" checked={x} onChange={(e) => setX(e.target.checked)} />
export default function Checkbox({ label, className = '', ...props }) {
  return (
    <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-brown ${className}`}>
      <input type="checkbox" className="h-5 w-5 cursor-pointer rounded accent-rust" {...props} />
      {label}
    </label>
  );
}
