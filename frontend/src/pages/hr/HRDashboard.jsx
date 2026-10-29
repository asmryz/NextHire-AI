// frontend/src/pages/hr/HRDashboard.jsx
// Owner: Aarian
// Starting dashboard. Numbers get connected when vacancy and inbox APIs are ready.
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, PageHeader } from '../../components/ui';

export default function HRDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome, ${user?.full_name?.split(' ')[0] || 'HR'}`}
        subtitle="Manage vacancies and review applications."
        actions={
          <Button onClick={() => navigate('/hr/vacancies')}>New Vacancy</Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {['Open vacancies', 'Applications this week', 'Pending evaluation', 'Closing this week'].map((label) => (
          <Card key={label} soft>
            <p className="text-[13px] font-medium">{label}</p>
            <p className="mt-1 font-heading text-[34px] font-extrabold">–</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
