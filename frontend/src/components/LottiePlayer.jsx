// frontend/src/components/LottiePlayer.jsx
// Owner: Shivani
// Plays a Lottie JSON animation (files in src/assets). Decorative only (hidden from screen readers).
// If the user turned off animations in system settings, a still frame is shown instead.
//   <LottiePlayer data={processingAnimation} className="w-40" />
//   <LottiePlayer data={successAnimation} loop={false} />
import { useEffect, useRef, useState } from 'react';
import Lottie from 'lottie-react';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export default function LottiePlayer({ data, loop = true, className = '', stillFrame }) {
  const ref = useRef(null);
  const [reduce] = useState(prefersReducedMotion);

  useEffect(() => {
    if (!reduce) return;
    // show a finished-looking frame instead of playing
    const frame = stillFrame ?? Math.max(0, (data?.op || 1) - 1);
    const t = setTimeout(() => ref.current?.goToAndStop(frame, true), 50);
    return () => clearTimeout(t);
  }, [reduce, data, stillFrame]);

  return (
    <div aria-hidden="true" className={className}>
      <Lottie lottieRef={ref} animationData={data} loop={!reduce && loop} autoplay={!reduce} />
    </div>
  );
}
