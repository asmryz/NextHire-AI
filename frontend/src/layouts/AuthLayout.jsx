// frontend/src/layouts/AuthLayout.jsx
// Owner: Aarian
// Split screen for Login / Sign Up / Forgot / Reset.
import { Outlet } from 'react-router-dom';
import { Logo } from '../components/ui';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-paper lg:flex-row">
      <section className="flex flex-col gap-10 bg-brown px-6 py-8 text-cream sm:px-12 lg:w-[42%] lg:py-12">
        <Logo dark />
        <div className="hidden max-w-sm lg:mt-auto lg:mb-auto lg:block">
          <h2 className="text-3xl font-semibold leading-snug text-cream">
            Hiring, from vacancy to offer, in one place.
          </h2>
          <p className="mt-4 text-[15px] font-light leading-relaxed text-line-strong">
            Structured application forms, fair AI-assisted screening and a clear pipeline for every candidate.
          </p>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <Outlet />
        </div>
      </section>
    </div>
  );
}