// frontend/src/pages/hr/HRDashboard.jsx
// Owner: Aarian
// HR home: live numbers from /api/vacancies/stats + shortcuts.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api, { getErrorMessage } from '../../services/api';
import { Alert, Button, Card, PageHeader } from '../../components/ui';

const TILES = [
  { key: 'open_vacancies', label: 'Open vacancies' },
  { key: 'applications_this_week', label: 'Applications this week' },
  { key: 'pending_evaluation', label: 'Pending evaluation' },
  { key: 'closing_this_week', label: 'Closing this week' },
];

export default function HRDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/vacancies/stats')
      .then(({ data }) => setStats(data))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome, ${user?.full_name?.split(' ')[0] || 'HR'}`}
        subtitle="Manage vacancies and review applications."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/hr/inbox')}>Application Inbox</Button>
            <Button onClick={() => navigate('/hr/vacancies/new')}>+ New Vacancy</Button>
          </>
        }
      />
      <Alert type="error">{error}</Alert>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TILES.map((t) => (
          <Card key={t.key} soft>
            <p className="text-[13px] font-medium">{t.label}</p>
            <p className="mt-1 font-heading text-[34px] font-extrabold">{stats ? stats[t.key] : '–'}</p>
          </Card>
        ))}
      </div>
      {stats && stats.draft_vacancies > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            You have <span className="font-semibold">{stats.draft_vacancies}</span> draft vacanc{stats.draft_vacancies === 1 ? 'y' : 'ies'} waiting to be published.
          </p>
          <Button variant="secondary" onClick={() => navigate('/hr/vacancies')}>Review drafts</Button>
        </Card>
      )}
    </div>
  );
}
