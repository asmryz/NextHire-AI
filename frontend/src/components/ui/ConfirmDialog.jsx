// frontend/src/components/ui/ConfirmDialog.jsx
// Owner: Aarian (UI kit)
//   <ConfirmDialog open={open} title="Log out" message="Are you sure you want to log out?"
//     confirmText="Yes" cancelText="No" onConfirm={...} onCancel={...} />
import { useEffect, useRef } from 'react';
import Button from './Button';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Yes',
  cancelText = 'No',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel?.();
      }}
      className="m-auto w-[min(92vw,420px)] rounded-2xl border border-line bg-white p-0 text-brown backdrop:bg-brown/40"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-muted">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>{cancelText}</Button>
          <Button variant={danger ? 'danger' : 'important'} onClick={onConfirm} loading={loading}>{confirmText}</Button>
        </div>
      </div>
    </dialog>
  );
}
