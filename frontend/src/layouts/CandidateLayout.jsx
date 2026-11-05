// frontend/src/layouts/CandidateLayout.jsx
// Owner: Aarian (Shivani's candidate pages render inside it)
// Candidate portal: sticky top bar with pill navigation (different from HR's sidebar) + footer.
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar, Logo } from '../components/ui';
import LogoutButton from '../components/LogoutButton';
import Icon from '../components/candidate/Icon';

const NAV = [
  { to: '/candidate', label: 'Home', end: true, icon: 'layers' },
  { to: '/candidate/vacancies', label: 'Open positions', icon: 'briefcase' },
  { to: '/candidate/applications', label: 'My applications', icon: 'file' },
  { to: '/candidate/profile', label: 'My profile', icon: 'user' },
];

export default function CandidateLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  const linkClass = ({ isActive }) =>
    `flex min-h-10 items-center gap-2 rounded-full px-4 text-sm transition-colors ${
      isActive ? 'bg-brown text-cream' : 'text-muted hover:bg-cream-soft hover:text-brown'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-8">
          <Logo />

          <nav aria-label="Candidate navigation" className="mx-auto hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                <Icon name={item.icon} className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-3 lg:ml-0 lg:flex">
            <NavLink to="/candidate/profile" className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-cream-soft">
              <Avatar name={user?.full_name} src={user?.profile_picture_url} size={34} />
              <span className="max-w-[140px] truncate text-sm font-medium">{user?.full_name?.split(' ')[0]}</span>
            </NavLink>
            <LogoutButton className="min-h-10 rounded-full px-3 text-sm text-muted hover:bg-cream-soft hover:text-brown" />
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="candidate-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-full hover:bg-cream-soft lg:hidden"
          >
            <Icon name={menuOpen ? 'close' : 'menu'} className="h-5 w-5" />
          </button>
        </div>

        {menuOpen && (
          <div id="candidate-menu" className="border-t border-line bg-white px-4 pb-5 pt-3 lg:hidden">
            <div className="mb-3 flex items-center gap-3 rounded-2xl bg-paper p-3">
              <Avatar name={user?.full_name} src={user?.profile_picture_url} size={40} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user?.full_name}</p>
                <p className="truncate text-xs text-muted">{user?.email}</p>
              </div>
            </div>
            <nav aria-label="Candidate navigation" className="flex flex-col gap-1">
              {NAV.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                  <Icon name={item.icon} className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <LogoutButton className="mt-2 min-h-10 w-full rounded-full px-4 text-left text-sm text-muted hover:bg-cream-soft hover:text-brown" />
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:px-8">
          <span>© {new Date().getFullYear()} NexHire AI</span>
          <span className="italic">Fair, structured hiring. No CV needed.</span>
        </div>
      </footer>
    </div>
  );
}
