// frontend/src/components/ui/Alert.jsx
// Owner: Aarian (UI kit)
//   <Alert type="error">Incorrect email or password.</Alert>
//   types: error | success | info
const STYLES = {
  error: 'bg-danger-soft text-danger border-danger/30',
  success: 'bg-success-soft text-success border-success/30',
  info: 'bg-cream-soft text-brown border-amber',
};

export default function Alert({ type = 'info', children, className = '' }) {
  if (!children) return null;
  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${STYLES[type]} ${className}`}>
      {children}
    </div>
  );
}
