import { useEffect, useRef, useState } from 'react';

/** First-visit curtain: the stencil wordmark is revealed once per session. */
export default function IntroLoader({ onComplete }) {
  const [exiting, setExiting] = useState(false);
  const completing = useRef(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setExiting(true);
      return undefined;
    }
    const timer = window.setTimeout(() => setExiting(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!exiting || completing.current) return undefined;
    completing.current = true;
    const timer = window.setTimeout(onComplete, 600);
    return () => window.clearTimeout(timer);
  }, [exiting, onComplete]);

  return (
    <div
      role="region"
      aria-label="Optional ZAVIKOO introduction"
      className={`intro-screen on-dark fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-cargo px-6 text-sand ${exiting ? 'intro-screen-exit' : ''}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-[7.5rem] bg-sand/10 sm:-translate-y-[9rem]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 h-px translate-y-[7.5rem] bg-sand/10 sm:translate-y-[9rem]" />

      <p className="intro-word stencil m-0 text-center text-[clamp(3.4rem,15.5vw,12.5rem)] font-normal leading-none tracking-[0.04em]" style={{ letterSpacing: '0.04em' }}>
        ZAVIKOO
      </p>
      <p className="intro-sub mt-6 text-center text-[0.8125rem] font-medium tracking-[0.5em] text-sand/70 sm:mt-8 sm:text-sm">
        CUSTOM ATELIER
      </p>

      <div aria-hidden="true" className="absolute bottom-10 left-1/2 h-px w-40 -translate-x-1/2 overflow-hidden bg-sand/15">
        <span className="intro-line block h-full bg-brass" />
      </div>
      <button
        type="button"
        onClick={() => setExiting(true)}
        className="intro-skip absolute bottom-6 right-5 px-4 py-3 text-sm font-medium text-sand/70 transition hover:text-sand sm:bottom-8 sm:right-10"
      >
        Skip intro
      </button>
    </div>
  );
}
