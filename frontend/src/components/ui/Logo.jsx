// frontend/src/components/ui/Logo.jsx
// Owner: Aarian (UI kit)
//   <Logo />  on light backgrounds,  <Logo dark />  on the brown sidebar
export default function Logo({ dark = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={`flex h-[34px] w-[34px] items-center justify-center rounded-[9px] font-heading text-lg font-extrabold ${
          dark ? 'bg-amber text-brown' : 'bg-brown text-amber'
        }`}
      >
        N
      </span>
      <span className={`font-heading text-xl font-extrabold ${dark ? 'text-cream' : 'text-brown'}`}>NexHire AI</span>
    </div>
  );
}
