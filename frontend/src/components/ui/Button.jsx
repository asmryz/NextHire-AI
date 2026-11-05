// frontend/src/components/ui/Button.jsx
// Owner: Aarian (UI kit - everyone uses, only Aarian edits)
//   <Button>Save</Button>
//   <Button variant="secondary">Cancel</Button>
//   <Button variant="important">Publish</Button>
//   <Button variant="danger">Delete</Button>
//   <Button loading={saving}>Save</Button>
import Spinner from './Spinner';

// hover = lighter/darker shade, pressed (active) = brown with cream text, like the nav pills
const VARIANTS = {
  primary: 'bg-amber text-brown hover:bg-amber-dark active:bg-brown active:text-cream',
  important: 'bg-brown text-cream hover:bg-brown-light active:bg-amber active:text-brown',
  secondary: 'bg-white text-brown border-[1.5px] border-brown hover:bg-cream-soft active:bg-brown active:text-cream',
  danger: 'bg-danger text-white hover:opacity-90 active:opacity-100 active:bg-brown',
  ghost: 'bg-transparent text-brown hover:bg-cream-soft active:bg-brown active:text-cream',
};

export default function Button({
  variant = 'primary',
  type = 'button',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex min-h-[var(--btn-h,2.75rem)] items-center justify-center gap-2 rounded-[10px] px-[18px] text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
