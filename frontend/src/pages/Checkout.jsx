import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { PageHead } from '../components/PageHead.jsx';
import { formatPrice } from '../components/ProductCard.jsx';
import { api, getData } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { track } from '../lib/analytics.js';

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, subtotal, clearCart } = useCart();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [form, setForm] = useState({ customerName: '', email: '', phone: '', line1: '', line2: '', city: '', province: '', postalCode: '', notes: '' });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [accountNotice, setAccountNotice] = useState('');
  const showToast = useToast();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef('');
  const checkoutTracked = useRef(false);

  useEffect(() => {
    let active = true;
    getData('/account/me').then(async ({ user }) => {
      if (!active) return;
      if (!user) {
        navigate(`/login?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`, { replace: true });
        return;
      }

      setForm((current) => ({
        ...current,
        customerName: user.fullName || current.customerName,
        email: user.email || current.email,
        phone: user.phone || current.phone,
      }));
      try {
        const addresses = await getData('/account/addresses');
        if (!active) return;
        setSavedAddresses(addresses);
        const preferred = addresses.find((address) => address.isDefault) || addresses[0];
        if (preferred) {
          setSelectedAddressId(String(preferred.id));
          setForm((current) => ({
            ...current,
            customerName: preferred.recipient || current.customerName,
            phone: preferred.phone || current.phone,
            line1: preferred.line1 || '',
            line2: preferred.line2 || '',
            city: preferred.city || '',
            province: preferred.province || '',
            postalCode: preferred.postalCode || '',
          }));
        }
      } catch (requestError) {
        if (active && ![401, 403].includes(requestError.response?.status)) {
          setAccountNotice('Saved addresses could not be loaded. You can still enter a delivery address below.');
        }
      }
    }).catch((requestError) => {
      if (!active) return;
      if ([401, 403].includes(requestError.response?.status)) {
        navigate(`/login?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`, { replace: true });
      } else {
        setAccountNotice('Your saved checkout details could not be loaded. Please enter your details below.');
      }
    }).finally(() => {
      if (active) setCheckingAuth(false);
    });
    return () => { active = false; };
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!checkingAuth && items.length > 0 && !checkoutTracked.current) {
      checkoutTracked.current = true;
      track('begin_checkout', {
        currency: 'PKR',
        value: subtotal / 100,
        items: items.map((item) => ({
          item_id: item.sku || item.slug,
          item_name: item.name,
          quantity: item.quantity,
        })),
      });
    }
  }, [checkingAuth, items, subtotal]);

  const selectSavedAddress = (event) => {
    const selectedId = event.target.value;
    setSelectedAddressId(selectedId);
    const address = savedAddresses.find((saved) => String(saved.id) === selectedId);
    if (!address) return;
    setForm((current) => ({
      ...current,
      customerName: address.recipient,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 || '',
      city: address.city,
      province: address.province,
      postalCode: address.postalCode || '',
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!items.length) {
      setError('Your cart is empty.');
      return;
    }

    setSubmitting(true);
    setError('');
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    try {
      const response = await api.post('/checkout', {
        customerName: form.customerName,
        email: form.email,
        phone: form.phone,
        address: { line1: form.line1, line2: form.line2, city: form.city, province: form.province, postalCode: form.postalCode, country: 'Pakistan' },
        notes: form.notes,
        items: items.map((item) => ({ sku: item.sku || item.slug, ...(item.customProductId ? { customProductId: item.customProductId } : {}), color: item.color, size: item.size, qty: item.quantity, ...(item.design ? { design: item.design } : {}) })),
      }, {
        headers: { 'Idempotency-Key': idempotencyKey.current },
      });
      track('purchase', {
        currency: 'PKR',
        value: subtotal / 100,
        items: items.map((item) => ({
          item_id: item.sku || item.slug,
          item_name: item.name,
          quantity: item.quantity,
        })),
      });
      idempotencyKey.current = '';
      clearCart();
      navigate(`/order-confirmation/${response.data.data.orderNumber}`);
    } catch (submitError) {
      const message = submitError.response?.data?.error?.message || 'Unable to create order. Your cart is unchanged; please try again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingAuth) {
    return (
      <section className="page py-24">
        <p role="status" className="text-center text-stone">Checking your account…</p>
      </section>
    );
  }

  return (
    <>
      <PageHead title="Checkout" intro="Confirm your contact and delivery details, then review the order summary before submitting." crumbs={[{ label: 'Home', to: '/' }, { label: 'Bag', to: '/cart' }, { label: 'Checkout' }]} />

      <section className="page grid gap-12 pb-24 md:pb-32 lg:grid-cols-[1.25fr_0.75fr] lg:gap-20">
        <form onSubmit={handleSubmit} className="space-y-12">
          {accountNotice && <p role="status" className="notice-warn">{accountNotice}</p>}
          {savedAddresses.length > 0 && (
            <div>
              <label className="field-label" htmlFor="saved-address">Use a saved address</label>
              <select id="saved-address" value={selectedAddressId} onChange={selectSavedAddress} className="field">
                <option value="">Enter a different address</option>
                {savedAddresses.map((address) => <option key={address.id} value={address.id}>{address.label}: {address.line1}, {address.city}</option>)}
              </select>
            </div>
          )}

          <fieldset>
            <legend className="mb-6 font-display text-[1.75rem]">Contact</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="co-customerName">Full name</label>
                <input id="co-customerName" required type="text" value={form.customerName} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} className="field" />
              </div>
              <div>
                <label className="field-label" htmlFor="co-email">Email</label>
                <input id="co-email" required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="field" />
              </div>
              <div>
                <label className="field-label" htmlFor="co-phone">Phone</label>
                <input id="co-phone" required type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="field" />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-6 font-display text-[1.75rem]">Delivery</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="co-line1">Delivery address</label>
                <input id="co-line1" required type="text" autoComplete="street-address" value={form.line1} onChange={(event) => setForm((current) => ({ ...current, line1: event.target.value }))} className="field" />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="co-line2">Apartment, suite, etc. (optional)</label>
                <input id="co-line2" type="text" autoComplete="address-line2" value={form.line2} onChange={(event) => setForm((current) => ({ ...current, line2: event.target.value }))} className="field" />
              </div>
              <div>
                <label className="field-label" htmlFor="co-city">City</label>
                <input id="co-city" required type="text" autoComplete="address-level2" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} className="field" />
              </div>
              <div>
                <label className="field-label" htmlFor="co-province">Province / region</label>
                <input id="co-province" type="text" autoComplete="address-level1" value={form.province} onChange={(event) => setForm((current) => ({ ...current, province: event.target.value }))} className="field" />
              </div>
              <div>
                <label className="field-label" htmlFor="co-postalCode">Postal code (optional)</label>
                <input id="co-postalCode" type="text" autoComplete="postal-code" value={form.postalCode} onChange={(event) => setForm((current) => ({ ...current, postalCode: event.target.value }))} className="field" />
              </div>
            </div>
          </fieldset>

          <div>
            <label className="field-label" htmlFor="co-notes">Order notes (optional)</label>
            <textarea id="co-notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows="4" className="field" />
          </div>

          <label className="flex items-start gap-3 text-sm leading-6 text-stone">
            <input type="checkbox" required className="check mt-1" />
            <span>
              I have read and agree to the <Link className="underline underline-offset-4" to="/returns-exchanges">Returns &amp; Exchanges</Link> and <Link className="underline underline-offset-4" to="/shipping-policy">Shipping</Link> policies. I understand customised items cannot be returned or exchanged for change of mind.
            </span>
          </label>

          <button type="submit" disabled={submitting || !items.length} className="btn btn-primary w-full sm:w-auto sm:min-w-[16rem]">{submitting ? 'Placing order…' : 'Place Order'}</button>
        </form>

        <aside className="h-fit border border-ink/15 bg-chalk p-7 md:p-9 lg:sticky lg:top-28">
          <h2 className="font-display text-[1.75rem]">Order summary</h2>
          <ul className="mt-7 divide-y divide-ink/12 border-y border-ink/12">
            {items.map((item) => (
              <li key={item.uniqueKey} className="flex justify-between gap-4 py-4 text-[0.9375rem]">
                <span className="min-w-0"><span className="block text-cargo">{item.name}</span><span className="text-stone">{item.color}, {item.size}, qty {item.quantity}</span></span>
                <span className="price-text shrink-0 tabular-nums">{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-baseline justify-between">
            <span className="font-semibold">Subtotal</span>
            <span className="price-text text-[1.5rem] tabular-nums">PKR {Math.round(subtotal / 100).toLocaleString('en-PK')}</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between text-sm"><span>Delivery</span><span>Free</span></div>
          <div className="mt-3 flex items-baseline justify-between border-t border-ink/15 pt-3"><span className="font-semibold">Total</span><span className="price-text text-[1.5rem] tabular-nums">PKR {Math.round(subtotal / 100).toLocaleString('en-PK')}</span></div>
          <p className="mt-5 text-[0.875rem] leading-6 text-stone">Payment: Cash on Delivery. Delivery is free across Pakistan and usually takes about 5–7 working days after order confirmation.</p>
          <Link to="/cart" className="link-line mt-6 text-[0.9375rem]">Back to bag</Link>
        </aside>
      </section>
    </>
  );
}
