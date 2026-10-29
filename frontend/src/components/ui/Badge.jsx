// frontend/src/components/ui/Badge.jsx
// Owner: Aarian (UI kit)
//   <Badge status="OPEN" />  or  <Badge tone="success">Open</Badge>
const TONES = {
  success: 'bg-success-soft text-success',
  warning: 'bg-cream text-brown',
  danger: 'bg-danger-soft text-danger',
  dark: 'bg-brown text-cream',
  neutral: 'bg-cream-soft text-muted',
};

// Database status -> label + colour (vacancy, application, match tags)
const STATUS = {
  OPEN: ['Open', 'success'],
  DRAFT: ['Draft', 'warning'],
  CLOSED: ['Closed', 'danger'],
  FILLED: ['Filled', 'dark'],
  APPLIED: ['Applied', 'neutral'],
  SHORTLISTED: ['Shortlisted', 'success'],
  INTERVIEW: ['Interview', 'warning'],
  OFFER: ['Offer', 'success'],
  HIRED: ['Hired', 'dark'],
  REJECTED: ['Rejected', 'danger'],
  STRONG: ['Strong Match', 'success'],
  POSSIBLE: ['Possible Match', 'warning'],
  NOT_A_FIT: ['Not a Fit', 'danger'],
  PENDING: ['Pending evaluation', 'dark'],
};

export default function Badge({ status, tone, children }) {
  const [label, statusTone] = STATUS[status] || [children, tone || 'neutral'];
  return (
    <span className={`inline-flex items-center rounded-full px-[11px] py-1 text-xs font-semibold whitespace-nowrap ${TONES[tone || statusTone]}`}>
      {children || label}
    </span>
  );
}
