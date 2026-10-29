// frontend/src/components/LogoutButton.jsx
// Owner: Aarian
// SRS Logout use case: confirm -> remove token -> login page with message.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from './ui';

export default function LogoutButton({ className = '' }) {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const confirm = () => {
    logout();
    setOpen(false);
    navigate('/login', { replace: true, state: { message: 'You have been logged out.' } });
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Logout
      </button>
      <ConfirmDialog
        open={open}
        title="Log out"
        message="Are you sure you want to log out?"
        confirmText="Yes"
        cancelText="No"
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
