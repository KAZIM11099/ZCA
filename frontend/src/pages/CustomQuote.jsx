import { useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { Breadcrumbs } from '../components/PageHead.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { track } from '../lib/analytics.js';

export default function CustomQuote() {
  const [form, setForm] = useState({ name: '', email: '', projectType: 'Custom t-shirt', quantity: '1', details: '' });
  const [submitted, setSubmitted] = useState(false);
  const [designImage, setDesignImage] = useState(null);
  const [imageReading, setImageReading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const imageInput = useRef(null);
  const showToast = useToast();

  const handleImageChange = (event) => {
    setError('');
    const file = event.target.files?.[0];
    if (!file) {
      setDesignImage(null);
      setImageReading(false);
      return;
    }
    setDesignImage(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setDesignImage(null);
      setError('Choose a PNG, JPG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setDesignImage(null);
      setError('Your image must be 4 MB or smaller.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    setImageReading(true);
    reader.onload = () => {
      if (typeof reader.result === 'string') setDesignImage({ name: file.name, dataUrl: reader.result });
      else setError('The selected image could not be read. Please choose another file.');
      setImageReading(false);
    };
    reader.onerror = () => {
      setError('The selected image could not be read. Please choose another file.');
      setImageReading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/quote', {
        name: form.name.trim(),
        email: form.email.trim(),
        projectType: form.projectType.trim(),
        quantity: Number(form.quantity),
        details: form.details.trim(),
        ...(designImage ? { designImageData: designImage.dataUrl } : {}),
      });
      track('generate_lead', { lead_type: 'custom_quote' });
      setSubmitted(true);
      showToast('Your custom quote request has been sent.', 'success');
    } catch (requestError) {
      const message = requestError.response?.data?.error?.message || 'Your request could not be submitted. Please try again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <header className="on-dark relative isolate overflow-hidden bg-cargo text-sand">
        <div className="page relative pb-[24px] pt-8 md:pb-[24px] md:pt-9 [&>nav]:mb-5">
          <Breadcrumbs dark items={[{ label: 'Home', to: '/' }, { label: 'Custom quote' }]} />
          <div className="max-w-4xl">
            <p className="mb-3 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-brass">
              <span className="h-px w-8 bg-brass" />
              Made personal · Made for you
            </p>
            <h1 className="display-l text-chalk">Tell us about<br className="hidden sm:block" /> your idea.</h1>
            <p className="mt-4 mb-6 max-w-2xl text-base leading-7 text-sand/75 sm:mb-6 sm:text-lg sm:leading-8">
              For teams, events, brands or anything custom. Share the brief and our studio will reply with a considered proposal.
            </p>
          </div>
        </div>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brass/60 to-transparent" />
      </header>

      <section className="page pb-24 pt-10 md:pb-32 md:pt-14">
        {submitted ? (
          <div className="mx-auto max-w-4xl border border-ink/10 bg-chalk shadow-soft">
            <div className="border-b border-ink/10 px-6 py-5 sm:px-9">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brass-deep">Request received</p>
            </div>
            <div className="px-6 py-9 sm:px-9 sm:py-12">
              <h2 className="display-m">Thanks, we got it.</h2>
              <p className="lede mt-4">Your custom quote request has been logged. Our design team will review your brief and respond with a tailored proposal.</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl border border-ink/10 border-t-2 border-t-brass bg-chalk shadow-[0_24px_70px_-48px_rgba(20,22,15,0.5)]">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 bg-paper/70 px-6 py-5 sm:px-9 sm:py-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brass-deep">Your project</p>
                <h2 className="mt-1 font-display text-2xl leading-tight text-cargo sm:text-3xl">Let’s build your brief.</h2>
              </div>
              <p className="text-xs font-medium text-stone"><span className="text-brass-deep">*</span> Required fields</p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-x-6 gap-y-6 p-6 sm:p-9 md:grid-cols-2 md:p-10">
              {error && (
                <p role="alert" className="border-l-2 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-800 md:col-span-2">
                  {error}
                </p>
              )}
              <div className="flex items-center gap-3 border-b border-ink/10 pb-2 md:col-span-2">
                <span className="font-display text-lg leading-none text-brass-deep">01</span>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-cargo">A little about you</p>
                <span aria-hidden="true" className="h-px flex-1 bg-ink/10" />
              </div>
              <div>
                <label className="field-label" htmlFor="q-name">Name <span className="text-brass-deep">*</span></label>
                <input id="q-name" required autoComplete="name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Your name" className="field" />
              </div>
              <div>
                <label className="field-label" htmlFor="q-email">Email <span className="text-brass-deep">*</span></label>
                <input id="q-email" required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="you@example.com" className="field" />
              </div>
              <div>
                <label className="field-label" htmlFor="q-type">Project type <span className="text-brass-deep">*</span></label>
                <select id="q-type" value={form.projectType} onChange={(event) => setForm((current) => ({ ...current, projectType: event.target.value }))} className="field">
                  <option>Custom t-shirt</option>
                  <option>Custom hoodie</option>
                  <option>Bulk team order</option>
                  <option>Brand or event merch</option>
                </select>
              </div>
              <div>
                <label htmlFor="quote-quantity" className="field-label">Quantity <span className="text-brass-deep">*</span></label>
                <input id="quote-quantity" required type="number" min="1" max="10000" step="1" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} className="field" />
                <p className="field-hint">Enter the total number of pieces you need.</p>
              </div>
              <div className="flex items-center gap-3 border-b border-ink/10 pb-2 md:col-span-2">
                <span className="font-display text-lg leading-none text-brass-deep">02</span>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-cargo">The project</p>
                <span aria-hidden="true" className="h-px flex-1 bg-ink/10" />
              </div>
              <div className="md:col-span-2">
                <label className="field-label" htmlFor="q-details">Project details <span className="text-brass-deep">*</span></label>
                <textarea id="q-details" required minLength={10} value={form.details} onChange={(event) => setForm((current) => ({ ...current, details: event.target.value }))} rows="6" placeholder="Tell us about your idea, preferred colours, quantities, sizing, and any timing details." className="field min-h-36 resize-y" />
                <p className="field-hint">A few details help our studio prepare the right proposal.</p>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="design-image" className="field-label">Design image <span className="font-normal text-stone">(optional)</span></label>
                <div className="border border-dashed border-ink/20 bg-paper/50 p-4 sm:p-5">
                  <input ref={imageInput} id="design-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} className="block w-full text-[0.9375rem] file:mr-4 file:cursor-pointer file:border-0 file:bg-cargo file:px-5 file:py-3 file:text-[0.9375rem] file:font-medium file:text-chalk hover:file:bg-olive" />
                  <p className="field-hint">PNG, JPG, or WebP up to 4 MB. Your image is shared with our team to review this quote request.</p>
                </div>
                {designImage && (
                  <div className="mt-4 flex flex-wrap items-start gap-4 border border-ink/10 bg-white p-3">
                    <img src={designImage.dataUrl} alt="Preview of your uploaded design" className="h-24 w-24 border border-ink/10 object-cover" />
                    <div className="text-sm"><p className="font-semibold text-cargo">{designImage.name}</p><button type="button" onClick={() => { setDesignImage(null); if (imageInput.current) imageInput.current.value = ''; }} className="mt-2 text-xs font-semibold text-brass-deep underline underline-offset-4 hover:text-cargo">Remove image</button></div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-4 border-t border-ink/10 pt-6 sm:flex-row sm:items-center sm:justify-between md:col-span-2">
                <p className="max-w-sm text-xs leading-5 text-stone">Your details are only used by our studio to respond to this request.</p>
                <button type="submit" disabled={submitting || imageReading} className="btn btn-primary w-full sm:w-auto sm:min-w-[15rem]">{submitting ? 'Sending…' : imageReading ? 'Reading image…' : 'Send quote request'}</button>
              </div>
            </form>
          </div>
        )}
      </section>
      <section className="border-y border-ink/10 bg-chalk">
        <div className="page grid gap-10 py-16 md:grid-cols-2 md:py-20">
          <div>
            <h2 className="display-m">A clear project brief helps.</h2>
            <p className="mt-5 leading-8 text-stone">Use the form to describe the garment or project, estimated quantity, size mix, preferred colours, artwork, and requested date. Share only information relevant to the enquiry; the studio can follow up if a detail needs clarification.</p>
            <p className="mt-4 leading-8 text-stone">For artwork, attach a supported image file or explain what you have available. If you have not finalized the design, describe the idea and ask what file or approval steps are needed before any work begins.</p>
          </div>
          <div>
            <h2 className="display-m">What happens after you send it?</h2>
            <ol className="mt-5 space-y-4">
              <li><h3 className="font-semibold">The studio reviews the brief</h3><p className="mt-1 leading-7 text-stone">Your request is received for review. Include enough detail to help identify the garment, quantity, and artwork requirements.</p></li>
              <li><h3 className="font-semibold">Project details are clarified</h3><p className="mt-1 leading-7 text-stone">The studio can confirm availability, quote details, minimums, and schedule for the specific request.</p></li>
              <li><h3 className="font-semibold">Confirm before proceeding</h3><p className="mt-1 leading-7 text-stone">Review the agreed product, artwork, quantity, price, payment, and delivery information before approving any project work.</p></li>
            </ol>
            <p className="mt-5 text-sm leading-6 text-stone">Minimum quantities, prices, production timing, samples, and payment terms vary by project and must be confirmed by the studio.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
