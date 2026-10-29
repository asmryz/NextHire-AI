// frontend/src/pages/interviewer/InterviewerHome.jsx
// Owner: Aarian (interviewer features are FYP-II)
import { Card, PageHeader } from '../../components/ui';

export default function InterviewerHome() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My interviews" subtitle="Interviews assigned to you will appear here." />
      <Card>
        <p className="text-sm text-muted">No interviews assigned yet.</p>
      </Card>
    </div>
  );
}
