// frontend/src/components/candidate/VacancyCard.jsx
// Owner: Shivani
// One open position as a card (Vacancies page + Home "Latest openings").
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button } from '../ui';
import Icon from './Icon';
import { closingLabel, initials } from './helpers';

export default function VacancyCard({ vacancy: v, disabled = false, index = 0 }) {
  const navigate = useNavigate();
  const closing = closingLabel(v.end_date);

  return (
    <article
      className="group relative flex animate-fade-up flex-col rounded-2xl border border-line bg-white p-5 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-amber hover:shadow-[0_16px_32px_-18px_rgba(77,42,0,0.35)]"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream text-sm font-semibold text-rust transition-colors group-hover:bg-amber group-hover:text-brown">
          {initials(v.department)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">{v.department}</p>
          <h3 className="mt-0.5 text-[17px] font-semibold leading-snug">
            <Link to={`/candidate/vacancies/${v.vacancy_id}`} className="after:absolute after:inset-0 focus:outline-none">
              {v.title}
            </Link>
          </h3>
        </div>
        {v.has_applied && <Badge tone="success">Applied</Badge>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {v.location && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 text-muted">
            <Icon name="pin" className="h-3.5 w-3.5" />{v.location}
          </span>
        )}
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${closing.urgent ? 'bg-danger-soft text-danger' : 'bg-paper text-muted'}`}>
          <Icon name="clock" className="h-3.5 w-3.5" />{closing.text}
        </span>
      </div>

      {v.summary && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted">{v.summary}</p>}

      <div aria-hidden="true" className="min-h-5 flex-1" />
      <div className="relative z-10 flex items-center justify-between gap-2 border-t border-line pt-4">
        <Link
          to={`/candidate/vacancies/${v.vacancy_id}`}
          className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border-[1.5px] border-brown bg-white px-4 text-sm font-semibold text-brown transition-colors hover:bg-cream-soft active:bg-brown active:text-cream"
        >
          View details <Icon name="arrow" className="h-4 w-4" />
        </Link>
        {v.has_applied ? null : (
          <Button className="min-h-10 px-4" disabled={disabled} onClick={() => navigate(`/candidate/vacancies/${v.vacancy_id}`)}>Apply</Button>
        )}
      </div>
    </article>
  );
}
