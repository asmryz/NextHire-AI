// frontend/src/layouts/InterviewerLayout.jsx
// Owner: Aarian
// Interviewer view (FYP-II) - simple header for now.
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar, Logo } from '../components/ui';
import LogoutButton from '../components/LogoutButton';

export default function InterviewerLayout() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-brown">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 sm:px-8">
          <Logo dark />
          <span className="rounded-full bg-amber px-3 py-1 text-xs font-semibold text-brown">Interviewer</span>
          <div className="ml-auto flex items-center gap-3">
            <Avatar name={user?.full_name} src={user?.profile_picture_url} size={36} />
            <span className="hidden text-sm font-semibold text-cream sm:inline">{user?.full_name}</span>
            <LogoutButton className="min-h-11 rounded-lg px-3 text-sm font-semibold text-cream hover:bg-brown-light" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
