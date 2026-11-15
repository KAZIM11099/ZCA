import { useEffect, useState } from 'react';

export default function GlobalLoadingOverlay() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const handleLoading = (event) => setActive(Boolean(event.detail?.active));
    window.addEventListener('zavikoo:loading', handleLoading);
    return () => window.removeEventListener('zavikoo:loading', handleLoading);
  }, []);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-cargo/45 backdrop-blur-[2px]" role="status" aria-label="Loading">
      <div className="grid h-[75px] w-[75px] place-items-center overflow-hidden rounded-full bg-white/95 shadow-2xl">
        <video src="/zavikoo-preloader.mp4" autoPlay loop muted playsInline className="h-full w-full object-contain" />
      </div>
    </div>
  );
}

