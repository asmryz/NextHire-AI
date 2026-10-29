// frontend/src/components/ui/Card.jsx
// Owner: Aarian (UI kit)
//   <Card>...</Card>           white card with soft border
//   <Card soft>...</Card>      cream card (stats)
export default function Card({ soft = false, className = '', children, ...props }) {
  return (
    <div
      className={`rounded-[14px] p-5 ${soft ? 'bg-cream' : 'border border-line bg-white'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
