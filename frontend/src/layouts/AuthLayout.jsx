
import { Outlet } from 'react-router-dom';
import LottiePlayer from '../components/LottiePlayer';
import hiringAnimation from '../assets/hiring-process.json';
import { Logo } from '../components/ui';

// Text under the animation. Change these lines to use other wording.
const HEADLINE = 'Hire smarter, faster and fairer.';
const TAGLINE = 'Where great talent meets the right role.';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-paper lg:h-screen lg:flex-row lg:overflow-hidden">
      <section className="relative flex flex-col gap-8 overflow-hidden bg-brown px-6 py-8 text-cream sm:px-12 lg:h-screen lg:w-[44%] lg:shrink-0 lg:py-10">
        <span aria-hidden="true" className="pointer-events-none absolute -right-24 top-1/4 h-80 w-80 rounded-full bg-amber/10 blur-3xl" />
        <Logo dark />
        <div className="relative hidden min-h-0 flex-1 flex-col justify-center gap-8 lg:flex">
          {/* the animation is square with empty space above and below: show the middle 4:3 part */}
          <div className="aspect-[4/3] w-full max-w-[460px] overflow-hidden rounded-3xl bg-cream shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6)] [@media(max-height:760px)]:max-w-[360px]">
            <LottiePlayer data={hiringAnimation} stillFrame={30} className="-mt-[12.5%] w-full" />
          </div>
          <div className="max-w-md">
            <h2 className="text-3xl font-semibold leading-snug text-cream">{HEADLINE}</h2>
            <p className="mt-2 text-base font-light text-line-strong">{TAGLINE}</p>
          </div>
        </div>
      </section>

      <section className="flex flex-1 justify-center px-4 py-10 sm:px-8 lg:h-screen lg:overflow-y-auto">
        <div className="my-auto w-full max-w-[420px]">
          <Outlet />
        </div>
      </section>
    </div>
  );
}
