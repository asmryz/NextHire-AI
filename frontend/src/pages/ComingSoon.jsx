// frontend/src/pages/ComingSoon.jsx
// Owner: Aarian
// Temporary page for screens that are not built yet. Replace the route in App.jsx when ready.
import { PageHeader, Card } from '../components/ui';

export default function ComingSoon({ title }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} />
      <Card>
        <p className="text-sm text-muted">This screen is being built.</p>
      </Card>
    </div>
  );
}
