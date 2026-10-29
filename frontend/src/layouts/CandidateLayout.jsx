// frontend/src/layouts/CandidateLayout.jsx
// Owner: Aarian (Shivani's candidate pages render inside it)
// White top navbar for the candidate portal (different from HR's sidebar).
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar, Logo } from '../components/ui';
import LogoutButton from '../components/LogoutButton';

const NAV = [
  { to: '/candidate', label: 'Dashboard', end: true },
  { to: '/candidate/vacancies', label: 'Vacancies' },
  { to: '/candidate/applications', label: 'My Applications' },
  { to: '/candidate/profile', label: 'Profile' },
];

export default function CandidateLayout() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-7 gap-y-2 px-4 py-3 sm:px-10">
          <Logo />
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="candidate-nav"
            className="ml-auto min-h-11 rounded-lg px-3 text-sm font-semibold md:hidden"
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>

          <nav
            id="candidate-nav"
            aria-label="Candidate navigation"
            className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-col md:flex md:w-auto md:flex-1 md:flex-row md:gap-1`}
          >
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-11 items-center border-b-[3px] px-3.5 text-sm ${
                    isActive ? 'border-amber font-semibold text-brown' : 'border-transparent font-medium text-muted hover:text-brown'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className={`${menuOpen ? 'flex' : 'hidden'} items-center gap-3 md:flex`}>
            <Avatar name={user?.full_name} src={user?.profile_picture_url} size={40} />
            <span className="max-w-[160px] truncate text-sm font-semibold">{user?.full_name}</span>
            <LogoutButton className="min-h-11 rounded-lg px-3 text-sm font-semibold text-muted hover:text-brown" />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
