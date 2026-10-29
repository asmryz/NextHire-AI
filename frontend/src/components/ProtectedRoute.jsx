// frontend/src/components/ProtectedRoute.jsx
// Owner: Aarian
// Wrap any page group that needs login (and optionally a role).
//   <Route element={<ProtectedRoute roles={['HR_ADMIN']} />}> ... </Route>
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homeForRole } from '../utils/roles';
import Spinner from './ui/Spinner';

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Spinner label="Loading" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  // Logged in but wrong role -> send to their own home (REQ-9)
  if (roles && !roles.includes(user.role)) return <Navigate to={homeForRole(user.role)} replace />;

  return <Outlet />;
}
