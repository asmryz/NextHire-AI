// frontend/src/components/LottiePlayer.jsx
// Owner: Shivani
// Plays a Lottie JSON animation (files in src/assets). Decorative only (hidden from screen readers).
// Uses lottie-web directly (the lottie-react wrapper does not load with Vite 8).
// If the user turned off animations in system settings, a still frame is shown instead.
//   <LottiePlayer data={processingAnimation} className="w-40" />
//   <LottiePlayer data={successAnimation} loop={false} />
// Needs:  cd frontend  &&  npm install lottie-web
import { useEffect, useRef } from 'react';
import * as lottieModule from 'lottie-web/build/player/lottie_light';

const lottie = lottieModule.default || lottieModule;

export default function LottiePlayer({ data, loop = true, className = '', stillFrame }) {
  const box = useRef(null);

  useEffect(() => {
    if (!box.current || !data) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const anim = lottie.loadAnimation({
      container: box.current,
      renderer: 'svg',
      loop: !reduce && loop,
      autoplay: !reduce,
      animationData: data,
    });
    if (reduce) {
      anim.addEventListener('DOMLoaded', () => anim.goToAndStop(stillFrame ?? Math.max(0, (data.op || 1) - 1), true));
    }
    return () => anim.destroy();
  }, [data, loop, stillFrame]);

  return <div ref={box} aria-hidden="true" className={className} />;
}
