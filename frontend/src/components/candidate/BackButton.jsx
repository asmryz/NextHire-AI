
import { Link } from 'react-router-dom';

export default function BackButton({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex h-9 w-fit items-center gap-2 rounded-[10px] border border-line-strong bg-white px-3.5 text-sm font-medium text-brown transition-colors hover:border-amber hover:bg-cream-soft"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M11 6l-6 6 6 6" />
      </svg>
      {children}
    </Link>
  );
}
