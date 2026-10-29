// frontend/src/components/ui/Spinner.jsx
// Owner: Aarian (UI kit)
export default function Spinner({ size = 'md', label }) {
  const box = size === 'sm' ? 'h-4 w-4 border-2' : 'h-8 w-8 border-[3px]';
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <span className={`${box} animate-spin rounded-full border-current border-t-transparent opacity-80`} aria-hidden="true" />
      <span className="sr-only">{label || 'Loading'}</span>
    </span>
  );
}
