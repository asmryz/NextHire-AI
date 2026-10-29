// frontend/src/App.jsx
// Owner: Aarian (shared file: to add a page, add ONE <Route> line and tell your partner)
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { homeForRole, ROLES } from './utils/roles';
import ProtectedRoute from './components/ProtectedRoute';

import AuthLayout from './layouts/AuthLayout';
import HRLayout from './layouts/HRLayout';
import CandidateLayout from './layouts/CandidateLayout';
import InterviewerLayout from './layouts/InterviewerLayout';

import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

import HRDashboard from './pages/hr/HRDashboard';
import VacancyList from './pages/hr/vacancies/VacancyList';
import VacancyEditor from './pages/hr/vacancies/VacancyEditor';
import CandidateDashboard from './pages/candidate/CandidateDashboard';
import Vacancies from './pages/candidate/Vacancies';
import VacancyDetail from './pages/candidate/VacancyDetail';
import Profile from './pages/candidate/Profile';
import InterviewerHome from './pages/interviewer/InterviewerHome';
import ComingSoon from './pages/ComingSoon';
import NotFound from './pages/NotFound';

function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? homeForRole(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      {/* Public: auth screens */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* HR Admin */}
      <Route element={<ProtectedRoute roles={[ROLES.HR_ADMIN]} />}>
        <Route path="/hr" element={<HRLayout />}>
          <Route index element={<HRDashboard />} />
          {/* Aarian */}
          <Route path="vacancies" element={<VacancyList />} />
          <Route path="vacancies/new" element={<VacancyEditor />} />
          <Route path="vacancies/:id" element={<VacancyEditor />} />
          <Route path="interviewers" element={<ComingSoon title="Interviewers" />} />
          {/* Shivani */}
          <Route path="inbox" element={<ComingSoon title="Application Inbox" />} />
        </Route>
      </Route>

      {/* Candidate (Shivani) */}
      <Route element={<ProtectedRoute roles={[ROLES.CANDIDATE]} />}>
        <Route path="/candidate" element={<CandidateLayout />}>
          <Route index element={<CandidateDashboard />} />
         <Route path="vacancies" element={<Vacancies />} />
<Route path="vacancies/:id" element={<VacancyDetail />} />
<Route path="vacancies/:id/apply" element={<ComingSoon title="Apply" />} />
<Route path="applications" element={<ComingSoon title="My Applications" />} />
<Route path="profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Interviewer */}
      <Route element={<ProtectedRoute roles={[ROLES.INTERVIEWER]} />}>
        <Route path="/interviewer" element={<InterviewerLayout />}>
          <Route index element={<InterviewerHome />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
