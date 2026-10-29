// frontend/src/pages/candidate/CandidateDashboard.jsx
// Owner: Shivani (starter by Aarian - Shivani builds the full dashboard here)
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui';

export default function CandidateDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <section className="bg-cream">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 sm:px-10">
        <p className="text-sm font-medium text-muted">Welcome back</p>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{user?.full_name}</h1>
        <p className="text-sm text-muted">Browse open positions and track your application here.</p>
        <div>
          <Button onClick={() => navigate('/candidate/vacancies')}>View open positions</Button>
        </div>
      </div>
    </section>
  );
}
