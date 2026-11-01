// frontend/src/components/StageTracker.jsx
// Owner: Shivani
// Application progress: Applied -> Shortlisted -> Interview -> Offer -> Hired (or Rejected).
//   <StageTracker stage="SHORTLISTED" />
const STEPS = [
  { key: 'APPLIED', label: 'Applied' },
  { key: 'SHORTLISTED', label: 'Shortlisted' },
  { key: 'INTERVIEW', label: 'Interview' },
  { key: 'OFFER', label: 'Offer' },
  { key: 'HIRED', label: 'Hired' },
];

export default function StageTracker({ stage, compact = false }) {
  if (stage === 'REJECTED') {
    return (
      <div className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
        This application was not successful. Thank you for your interest. You can now apply for another open position.
      </div>
    );
  }

  const current = Math.max(0, STEPS.findIndex((s) => s.key === stage));

  return (
    <ol aria-label="Application progress" className="grid grid-cols-5 gap-2">
      {STEPS.map((s, i) => {
        const done = i < current;
        const isCurrent = i === current;
        return (
          <li key={s.key} aria-current={isCurrent ? 'step' : undefined} className="flex flex-col gap-2">
            <span
              className={`h-2 rounded-full ${done ? 'bg-rust' : isCurrent ? 'bg-amber' : 'bg-cream'}`}
              aria-hidden="true"
            />
            {!compact && (
              <span className={`text-xs sm:text-sm ${done || isCurrent ? 'font-semibold text-brown' : 'font-medium text-muted'}`}>
                {s.label}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
