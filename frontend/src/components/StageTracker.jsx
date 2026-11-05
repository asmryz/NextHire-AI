// frontend/src/components/StageTracker.jsx
// Owner: Shivani
// Application progress shown to the candidate: Applied -> Shortlisted -> Interview.
// Offer / Hired are not shown as steps; when reached, every step is complete and a note is shown.
//   <StageTracker stage="SHORTLISTED" />          full tracker with labels
//   <StageTracker stage="APPLIED" compact />       thin bar only (cards)
const STEPS = [
  { key: 'APPLIED', label: 'Applied', hint: 'Form received' },
  { key: 'SHORTLISTED', label: 'Shortlisted', hint: 'Profile reviewed' },
  { key: 'INTERVIEW', label: 'Interview', hint: 'Meet the team' },
];
const AFTER = { OFFER: 'Great news: you have received an offer. HR will contact you with the details.', HIRED: 'Congratulations, you have been hired!' };

export default function StageTracker({ stage, compact = false }) {
  if (stage === 'REJECTED') {
    return (
      <div className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
        This application was not successful. Thank you for your interest, you can now apply for another open position.
      </div>
    );
  }

  const finished = Boolean(AFTER[stage]);
  const current = finished ? STEPS.length : Math.max(0, STEPS.findIndex((s) => s.key === stage));

  if (compact) {
    return (
      <div className="flex gap-1.5" role="img" aria-label={`Progress: ${finished ? 'completed' : STEPS[current].label}`}>
        {STEPS.map((s, i) => (
          <span key={s.key} className={`h-1.5 flex-1 rounded-full ${i < current ? 'bg-rust' : i === current ? 'bg-amber' : 'bg-cream'}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ol aria-label="Application progress" className="grid grid-cols-3">
        {STEPS.map((s, i) => {
          const done = i < current;
          const isCurrent = i === current;
          return (
            <li key={s.key} aria-current={isCurrent ? 'step' : undefined} className="relative flex flex-col items-center gap-2 text-center">
              {/* connector to the next step */}
              {i < STEPS.length - 1 && (
                <span aria-hidden="true" className="absolute left-1/2 top-[15px] h-[3px] w-full bg-cream">
                  <span className={`block h-full bg-rust transition-[width] duration-700 ${done ? 'w-full' : 'w-0'}`} />
                </span>
              )}
              <span className="relative flex h-8 w-8 items-center justify-center">
                {isCurrent && <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-amber/40" />}
                <span
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                    done ? 'bg-rust text-white' : isCurrent ? 'bg-amber text-brown' : 'border-2 border-cream bg-white text-muted'
                  }`}
                >
                  {done ? (
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  ) : i + 1}
                </span>
              </span>
              <span className={`text-[13px] sm:text-sm ${done || isCurrent ? 'font-medium text-brown' : 'text-muted'}`}>{s.label}</span>
              <span className="hidden text-xs italic text-muted sm:block">{isCurrent ? 'In progress' : done ? 'Done' : s.hint}</span>
            </li>
          );
        })}
      </ol>
      {finished && <p className="rounded-xl bg-success-soft px-4 py-3 text-sm text-success">{AFTER[stage]}</p>}
    </div>
  );
}
