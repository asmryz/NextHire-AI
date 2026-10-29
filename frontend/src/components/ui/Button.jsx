// frontend/src/components/ui/Button.jsx
// Owner: Aarian (UI kit - everyone uses, only Aarian edits)
//   <Button>Save</Button>
//   <Button variant="secondary">Cancel</Button>
//   <Button variant="important">Publish</Button>
//   <Button variant="danger">Delete</Button>
//   <Button loading={saving}>Save</Button>
import Spinner from './Spinner';

const VARIANTS = {
  primary: 'bg-amber text-brown hover:bg-amber-dark',
  important: 'bg-brown text-cream hover:bg-brown-light',
  secondary: 'bg-white text-brown border-[1.5px] border-brown hover:bg-cream-soft',
  danger: 'bg-danger text-white hover:opacity-90',
  ghost: 'bg-transparent text-brown hover:bg-cream-soft',
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
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-[18px] text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
