// frontend/src/layouts/HRLayout.jsx
// Owner: Aarian
// Brown sidebar for every HR screen. Pages render inside <Outlet />.
// To add a menu item: add one line to NAV below (tell your partner first).
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar, Logo } from '../components/ui';
import LogoutButton from '../components/LogoutButton';

const NAV = [
  { to: '/hr', label: 'Dashboard', end: true, icon: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z' },
  { to: '/hr/vacancies', label: 'Vacancies', icon: 'M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' },
  { to: '/hr/inbox', label: 'Application Inbox', icon: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z' },
  { to: '/hr/interviewers', label: 'Interviewers', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8' },
];

function NavIcon({ d }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function HRLayout() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper lg:flex">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between bg-brown px-4 py-3 lg:hidden">
        <Logo dark />
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="hr-sidebar"
          className="min-h-11 rounded-lg px-3 text-sm font-semibold text-cream"
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      <aside
        id="hr-sidebar"
        className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-col gap-1.5 bg-brown px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[248px] lg:shrink-0`}
      >
        <div className="hidden px-2 pb-7 lg:block">
          <Logo dark />
        </div>
        <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-line-strong">HR Panel</p>
        <nav aria-label="HR navigation" className="flex flex-col gap-1.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-[10px] px-3.5 text-sm ${
                  isActive ? 'bg-amber font-semibold text-brown' : 'font-medium text-cream hover:bg-brown-light'
                }`
              }
            >
              <NavIcon d={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex items-center gap-3 border-t border-brown-light px-2 pt-4">
          <Avatar name={user?.full_name} src={user?.profile_picture_url} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-cream">{user?.full_name}</p>
            <p className="truncate text-xs text-line-strong">{user?.email}</p>
          </div>
        </div>
        <LogoutButton className="mt-2 min-h-11 rounded-[10px] px-3.5 text-left text-sm font-medium text-cream hover:bg-brown-light" />
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
