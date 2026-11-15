import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { SocialLinks } from '../components/SocialLinks.jsx';
import { Breadcrumbs } from '../components/PageHead.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { businessFacts } from '../content/businessFacts.js';
import { track } from '../lib/analytics.js';

const initialForm = { name: '', email: '', phone: '', subject: '', message: '', website: '' };
const CONTACT_COOLDOWN_MS = 60 * 1000;

export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [secondsReady, setSecondsReady] = useState(3);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const startedAt = useRef(Date.now());
  const showToast = useToast();

  useEffect(() => {
    const lastSent = Number(sessionStorage.getItem('zavikoo-contact-last-sent') || 0);
    const remaining = Math.max(0, Math.ceil((CONTACT_COOLDOWN_MS - (Date.now() - lastSent)) / 1000));
    setCooldownLeft(remaining);

    const timer = window.setInterval(() => {
      setSecondsReady((value) => Math.max(0, value - 1));
      setCooldownLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (secondsReady > 0 || cooldownLeft > 0 || form.website.trim()) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const response = await api.post('/contact', { ...form, startedAt: startedAt.current });
      track('generate_lead', { lead_type: 'contact' });
      sessionStorage.setItem('zavikoo-contact-last-sent', String(Date.now()));
      setCooldownLeft(Math.ceil(CONTACT_COOLDOWN_MS / 1000));
      startedAt.current = Date.now();
      setSecondsReady(3);
      setForm(initialForm);
      setSuccess(response.data.data.message);
      showToast(response.data.data.message, 'success');
    } catch (requestError) {
      const message = requestError.response?.data?.error?.message || 'Your message could not be sent. Please try again in a moment.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  return (
    <section className="page py-12 md:py-20">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Contact' }]} />
      <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
        <div>
          <h1 className="display-l">Let’s start a conversation.</h1>
          <p className="lede mt-6">Questions about an order, a custom piece, or working together? Send a note to our studio and we will get back to you.</p>

          <dl className="mt-12 divide-y divide-ink/12 border-y border-ink/12 text-[1.0625rem]">
            {businessFacts.email && <div className="py-5"><dt className="text-[0.875rem] text-stone">Email</dt><dd className="mt-1"><a href={`mailto:${businessFacts.email}`} className="transition hover:text-brass-deep">{businessFacts.email}</a></dd></div>}
            {businessFacts.phone && <div className="py-5"><dt className="text-[0.875rem] text-stone">Call</dt><dd className="mt-1"><a href={`tel:${businessFacts.phone}`} className="transition hover:text-brass-deep">{businessFacts.phone}</a></dd></div>}
            {businessFacts.whatsapp && <div className="py-5"><dt className="text-[0.875rem] text-stone">WhatsApp</dt><dd className="mt-1"><a href={`https://wa.me/${businessFacts.whatsapp.replace(/\D/g, '')}`} className="transition hover:text-brass-deep">{businessFacts.whatsapp}</a></dd></div>}
            {businessFacts.city && <div className="py-5"><dt className="text-[0.875rem] text-stone">Studio</dt><dd className="mt-1">{[businessFacts.city, businessFacts.region, businessFacts.country].filter(Boolean).join(', ')}</dd></div>}
            {!businessFacts.email && !businessFacts.phone && !businessFacts.whatsapp && <p className="py-5 text-stone">Use the enquiry form to contact the studio.</p>}
          </dl>

          <div className="mt-8">
            <p className="mb-4 text-[0.9375rem] font-semibold">Follow the atelier</p>
            <SocialLinks />
          </div>
        </div>

        <div className="border border-ink/15 bg-chalk p-6 sm:p-9 md:p-12">
          <h2 className="display-m">How can we help?</h2>
          <form onSubmit={submit} className="mt-8 space-y-5" autoComplete="off">
            <div className="absolute -left-[10000px]" aria-hidden="true">
              <label htmlFor="c-website">Website</label>
              <input id="c-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={update} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="c-name">Your name</label>
                <input id="c-name" name="name" type="text" autoComplete="name" minLength={2} maxLength={191} required value={form.name} onChange={update} className="field" />
              </div>
              <div>
                <label className="field-label" htmlFor="c-email">Email address</label>
                <input id="c-email" name="email" type="email" autoComplete="email" maxLength={191} required value={form.email} onChange={update} className="field" />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="c-phone">Phone number (optional)</label>
                <input id="c-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} value={form.phone} onChange={update} className="field" />
              </div>
              <div>
                <label className="field-label" htmlFor="c-subject">What is this about?</label>
                <select id="c-subject" name="subject" required value={form.subject} onChange={update} className="field">
                  <option value="">Choose a topic</option>
                  <option>Order support</option>
                  <option>Product question</option>
                  <option>Custom design</option>
                  <option>Bulk or collaboration</option>
                  <option>Something else</option>
                </select>
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="c-message">Your message</label>
              <textarea id="c-message" name="message" required minLength={10} maxLength={10000} rows={6} value={form.message} onChange={update} placeholder="Tell us a little about what you need…" className="field resize-y" />
              <p className="field-hint text-right">{form.message.length}/10000</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-5">
              <p className="max-w-xs text-[0.8125rem] leading-5 text-stone">By sending this message, you agree that our studio may contact you about your enquiry.</p>
              <button disabled={busy || secondsReady > 0 || cooldownLeft > 0} className="btn btn-primary">
                {busy ? 'Sending…' : cooldownLeft > 0 ? `Try again in ${cooldownLeft}s` : secondsReady > 0 ? `Ready in ${secondsReady}s` : 'Send message'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
