// frontend/src/components/ui/PageHeader.jsx
// Owner: Aarian (UI kit)
//   <PageHeader title="Vacancies" subtitle="..." actions={<Button>New Vacancy</Button>} />
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="min-w-[240px] flex-1">
        <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
