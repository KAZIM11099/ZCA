const measurementId = import.meta.env.VITE_GA4_ID;
const allowedParameters = new Set(['currency', 'value', 'items', 'item_id', 'item_name', 'quantity', 'lead_type', 'page_path']);
let initialized = false;

export function initializeAnalytics() {
  if (!measurementId || typeof window === 'undefined' || initialized) return;
  initialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.onerror = () => console.error('Google Analytics could not be loaded.');
  document.head.appendChild(script);
}

function filterParameters(parameters) {
  return Object.fromEntries(
    Object.entries(parameters).filter(([key]) => allowedParameters.has(key)),
  );
}

export function track(eventName, parameters = {}) {
  if (!measurementId || typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, filterParameters(parameters));
}
