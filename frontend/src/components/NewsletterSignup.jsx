import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { IconClose } from './Icons.jsx';
import { useToast } from '../context/ToastContext.jsx';

const dismissedKey = 'zavikoo-newsletter-dismissed';

export function NewsletterForm({ compact = false, onSubscribed, tone = 'light' }) {
  const dark = tone === 'dark';
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [website, setWebsite] = useState('');
  const [ready, setReady] = useState(false);
  const startedAt = useRef(Date.now());
  const showToast = useToast();

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  const subscribe = async (event) => {
    event.preventDefault();
    if (!ready || website.trim()) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const response = await api.post('/newsletter/subscribe', { email, consent: true, website, startedAt: startedAt.current });
      setStatus(response.data.data.message);
      showToast(response.data.data.message, 'success');
      setEmail('');
      onSubscribed?.();
    } catch (requestError) {
      const message = requestError.response?.data?.error?.message || 'We could not save your subscription. Please try again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const inputId = compact ? 'footer-newsletter-email' : 'modal-newsletter-email';
  return (
    <form onSubmit={subscribe} className="w-full">
      <div className="absolute -left-[10000px]" aria-hidden="true">
        <label htmlFor={`${inputId}-website`}>Website</label>
        <input id={`${inputId}-website`} name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor={inputId}>Email address</label>
        <input
          id={inputId}
          type="email"
          autoComplete="email"
          required
          maxLength="191"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Your email address"
          className={dark
            ? 'min-h-[3.25rem] min-w-0 flex-1 border border-sand/30 bg-transparent px-4 text-base text-chalk placeholder:text-sand/50 transition focus:border-sand focus:outline-none focus:ring-2 focus:ring-brass/50'
            : 'field min-w-0 flex-1'}
        />
        <button type="submit" disabled={busy || !ready || Boolean(website.trim())} className={`btn shrink-0 ${dark ? 'btn-sand' : 'btn-primary'}`}>
          {busy ? 'Subscribing…' : 'Subscribe'}
        </button>
      </div>
      <label className={`mt-4 flex cursor-pointer items-start gap-3 text-[0.8125rem] leading-5 ${dark ? 'text-sand/70' : 'text-stone'} ${compact ? 'max-w-xl' : ''}`}>
        <input type="checkbox" required className="check mt-0.5" />
        <span>I consent to receiving ZAVIKOO email updates and offers.</span>
      </label>
      {error && <p role="alert" className={`mt-3 text-sm ${dark ? 'text-[#f0c4b8]' : 'text-red-700'}`}>{error}</p>}
      {status && <p role="status" className={`mt-3 text-sm ${dark ? 'text-sand' : 'text-[#657149]'}`}>{status}</p>}
      {!compact && (
        <p className="mt-3 text-[0.8125rem] leading-5 text-stone">
          Read our <Link to="/privacy-policy" className="underline underline-offset-2 hover:text-cargo">Privacy Policy</Link> to learn how we handle your information.
        </p>
      )}
    </form>
  );
}

export function NewsletterPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(dismissedKey) === 'true') return undefined;
    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const dismiss = () => {
    sessionStorage.setItem(dismissedKey, 'true');
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="newsletter-backdrop fixed inset-0 z-[80] flex items-center justify-center bg-cargo/60 px-4 py-8 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-title"
        className="newsletter-dialog relative grid w-full max-w-3xl overflow-hidden bg-chalk shadow-lift md:grid-cols-[0.9fr_1.1fr]"
      >
        <div aria-hidden="true" className="on-dark relative hidden flex-col justify-between bg-cargo p-8 text-sand md:flex">
          <span className="stencil text-[2.4rem] leading-none tracking-[0.06em]">ZAVIKOO</span>
          <div>
            <div className="mb-5 h-px w-12 bg-brass" />
            <p className="font-display text-[1.6rem] leading-tight text-chalk">Made personal, one piece at a time.</p>
          </div>
        </div>
        <div className="relative p-7 sm:p-10">
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close newsletter signup"
            className="absolute right-3 top-3 grid h-11 w-11 place-items-center text-cargo transition hover:text-brass-deep"
          >
            <IconClose className="h-5 w-5" />
          </button>
          <h2 id="newsletter-title" className="max-w-sm pr-8 font-display text-[2rem] leading-[1.08] sm:text-[2.4rem]">
            A little more ZAVIKOO in your inbox.
          </h2>
          <p className="mt-4 max-w-md text-[0.9375rem] leading-7 text-stone">
            Subscribe for the latest updates, new arrivals and occasional discounts.
          </p>
          <div className="mt-7">
            <NewsletterForm onSubscribed={dismiss} />
          </div>
        </div>
      </section>
    </div>
  );
}
