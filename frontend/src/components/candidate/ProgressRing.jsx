
export default function ProgressRing({ value = 0, size = 72, stroke = 7, label = 'Profile complete', dark = false }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-flex shrink-0" style={{ width: size, height: size }}
      role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          className={dark ? 'stroke-brown-light' : 'stroke-cream'} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (v / 100) * c}
          className={`transition-[stroke-dashoffset] duration-700 ${v === 100 ? 'stroke-success' : 'stroke-rust'}`} />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center font-semibold ${size < 56 ? "text-[11px]" : "text-sm"} ${dark ? 'text-cream' : 'text-brown'}`}>
        {v}%
      </span>
    </div>
  );
}
