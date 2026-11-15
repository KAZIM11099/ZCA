import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getData } from '../lib/api.js';
import { scrollToTop } from '../lib/smoothScroll.js';
import { GarmentDesignBoard } from '../components/GarmentDesignPreview.jsx';
import { GoogleSignIn } from '../components/GoogleSignIn.jsx';
import { useToast } from '../context/ToastContext.jsx';

const tabs = [
  { label: 'Orders', to: '/account/orders', key: 'orders' },
  { label: 'My designs', to: '/account/designs', key: 'designs' },
  { label: 'Addresses', to: '/account/addresses', key: 'addresses' },
  { label: 'Profile', to: '/account/profile', key: 'profile' },
];

const orderStatuses = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const blankAddress = {
  label: 'Home', recipient: '', phone: '', line1: '', line2: '',
  city: '', province: '', postalCode: '', country: 'Pakistan', isDefault: false,
};

function Field({ label, name, value, onChange, required = false, type = 'text', autoComplete, wide = false }) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="mb-2 block text-xs font-semibold text-charcoal">{label}{required && <span className="ml-1 text-orange">*</span>}</span>
      <input name={name} type={type} value={value ?? ''} onChange={onChange} required={required} autoComplete={autoComplete} className="min-h-11 w-full rounded-tile border border-ink/15 bg-white px-3 py-2.5 text-sm" />
    </label>
  );
}

function PasswordField({ label, name, value, onChange, visible, onToggle, autoComplete = 'new-password', required = false }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-charcoal">{label}{required && <span className="ml-1 text-orange">*</span>}</span>
      <span className="relative block">
        <input name={name} type={visible ? 'text' : 'password'} value={value ?? ''} onChange={onChange} required={required} autoComplete={autoComplete} className="min-h-11 w-full rounded-tile border border-ink/15 bg-white px-3 py-2.5 pr-11 text-sm" />
        <button type="button" onClick={onToggle} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={visible} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-charcoal hover:bg-paper hover:text-cargo">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" />
            <circle cx="12" cy="12" r="2.5" />
            {!visible && <path strokeLinecap="round" d="M4 20 20 4" />}
          </svg>
        </button>
      </span>
    </label>
  );
}

function money(paisa) {
  return `PKR ${(Number(paisa || 0) / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

export default function AccountPage({ tab = 'orders' }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [orderStatus, setOrderStatus] = useState('ALL');
  const [orderPage, setOrderPage] = useState(1);
  const [designPage, setDesignPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [designs, setDesigns] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [profile, setProfile] = useState({ fullName: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [addressForm, setAddressForm] = useState(blankAddress);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const showToast = useToast();

  const loadAccount = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const account = await getData('/account/me');
      setUser(account.user);
      setProfile({ fullName: account.user.fullName || '', phone: account.user.phone || '' });
      const [savedAddresses, savedOrders, savedDesigns] = await Promise.all([
        getData('/account/addresses'),
        getData('/account/orders'),
        getData('/account/designs'),
      ]);
      setAddresses(savedAddresses);
      setOrders(savedOrders);
      setDesigns(savedDesigns);
    } catch (requestError) {
      if (requestError.response?.status === 401 || requestError.response?.status === 403) {
        setUser(null);
      } else {
        const message = requestError.response?.data?.error?.message || 'Could not load your account details.';
        setError(message);
        showToast(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAccount(); }, [loadAccount]);

  const signInWithGoogle = async (credential) => {
    setBusy(true);
    setError('');
    try {
      await api.post('/account/google', { credential });
      window.dispatchEvent(new Event('zavikoo:customer-session-created'));
      await loadAccount();
    } catch (requestError) {
      const message = requestError.response?.data?.error?.message || 'Google sign-in could not be completed. Please try again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await api.patch('/account/profile', profile);
      setUser(response.data.data.user);
      setNotice('Your profile has been updated.');
      showToast('Your profile has been updated.', 'success');
    } catch (requestError) {
      const message = requestError.response?.data?.error?.message || 'Unable to save your profile.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      const message = 'New password and confirmation do not match.';
      setError(message);
      showToast(message, 'error');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.patch('/account/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setNotice('Your password has been changed.');
      showToast('Your password has been changed.', 'success');
    } catch (requestError) {
      const message = requestError.response?.data?.error?.message || 'Unable to change your password.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveAddress = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (editingId) await api.patch(`/account/addresses/${editingId}`, addressForm);
      else await api.post('/account/addresses', addressForm);
      setAddressForm(blankAddress);
      setEditingId(null);
      await loadAccount();
      setNotice(editingId ? 'Address updated.' : 'Address saved.');
      showToast(editingId ? 'Address updated.' : 'Address saved.', 'success');
    } catch (requestError) {
      const message = requestError.response?.data?.error?.message || 'Unable to save this address.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const deleteAddress = async (id) => {
    if (!window.confirm('Remove this saved address?')) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.delete(`/account/addresses/${id}`);
      await loadAccount();
      setNotice('Address removed.');
      showToast('Address removed.', 'success');
    } catch (requestError) {
      const message = requestError.response?.data?.error?.message || 'Unable to remove this address.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    try {
      await api.post('/account/logout');
      window.dispatchEvent(new Event('zavikoo:customer-session-ended'));
      navigate('/login', { replace: true });
    } catch (requestError) {
      const message = requestError.response?.data?.error?.message || 'Unable to sign out.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const startEditing = (address) => {
    setEditingId(address.id);
    setAddressForm({
      label: address.label, recipient: address.recipient, phone: address.phone,
      line1: address.line1, line2: address.line2 || '', city: address.city,
      province: address.province, postalCode: address.postalCode || '',
      country: address.country, isDefault: address.isDefault,
    });
    scrollToTop();
  };

  const handleAddressChange = (event) => {
    const { name, value, checked, type } = event.target;
    setAddressForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const filteredOrders = useMemo(() => (
    orderStatus === 'ALL' ? orders : orders.filter((order) => order.status === orderStatus)
  ), [orders, orderStatus]);
  const orderPageCount = Math.max(1, Math.ceil(filteredOrders.length / 15));
  const visibleOrders = filteredOrders.slice((orderPage - 1) * 15, orderPage * 15);
  const designPageCount = Math.max(1, Math.ceil(designs.length / 9));
  const visibleDesigns = designs.slice((designPage - 1) * 9, designPage * 9);
  const statusCounts = useMemo(() => orders.reduce((counts, order) => {
    counts[order.status] = (counts[order.status] || 0) + 1;
    return counts;
  }, {}), [orders]);

  useEffect(() => {
    if (orderPage > orderPageCount) setOrderPage(orderPageCount);
  }, [orderPage, orderPageCount]);

  useEffect(() => {
    if (designPage > designPageCount) setDesignPage(designPageCount);
  }, [designPage, designPageCount]);

  if (loading) {
    return <section className="mx-auto min-h-[50vh] max-w-page px-gutter py-16 text-sm text-charcoal" aria-live="polite">Loading your account…</section>;
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-page px-gutter py-16">
        <div className="mx-auto max-w-xl border border-ink/10 bg-white p-8 text-center shadow-soft sm:p-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal">Your ZAVIKOO account</p>
          <h1 className="mt-3 text-4xl">Your details, all in one place.</h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-charcoal">Sign in to manage your profile, delivery addresses and order history.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/login?returnTo=%2Faccount" className="btn btn-primary">Sign in</Link>
            <Link to="/register?returnTo=%2Faccount" className="btn btn-secondary">Create account</Link>
          </div>
          <div className="mx-auto my-7 flex max-w-sm items-center gap-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone" aria-hidden="true">
            <span className="h-px flex-1 bg-ink/15" />or<span className="h-px flex-1 bg-ink/15" />
          </div>
          <GoogleSignIn onCredential={signInWithGoogle} disabled={busy} />
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-page px-gutter py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal">Your account</p>
          <h1 className="mt-2 text-4xl md:text-5xl">{tab === 'profile' ? 'Profile' : tab === 'addresses' ? 'Addresses' : tab === 'designs' ? 'My designs' : 'Orders'}</h1>
          <p className="mt-2 text-sm text-charcoal">{user.fullName} <span className="px-1.5">·</span> {user.email}</p>
        </div>
        <button onClick={signOut} disabled={busy} className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal underline decoration-ink/20 underline-offset-4 hover:text-ink">Sign out</button>
      </div>

      <div className="mb-8 flex gap-6 overflow-x-auto border-b border-ink/10">
        {tabs.map((entry) => (
          <Link key={entry.to} to={entry.to} className={`whitespace-nowrap border-b-2 px-1 pb-3 text-xs font-semibold uppercase tracking-[0.12em] ${tab === entry.key ? 'border-ink text-ink' : 'border-transparent text-charcoal hover:text-ink'}`}>
            {entry.label}
          </Link>
        ))}
      </div>


      {tab === 'designs' && (
        <div className="space-y-6">
          {!designs.length && (
            <div className="border border-dashed border-ink/20 bg-white p-7">
              <h2 className="font-body text-base font-semibold">No saved designs yet</h2>
              <p className="mt-2 text-sm leading-6 text-charcoal">Save a custom garment design to keep it here for later.</p>
              <Link to="/customize" className="mt-5 inline-flex border-b border-ink/30 pb-1 text-xs font-semibold uppercase tracking-[0.12em]">Start designing</Link>
            </div>
          )}
          {!!designs.length && <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visibleDesigns.map((design) => {
            const layout = design.layoutJson || {};
            const garmentName = design.customProduct?.name || design.product?.name || layout.garmentName || 'Custom garment';
            return (
              <article key={design.id} className="border border-ink/10 bg-[#f2f1ed] p-4 shadow-soft">
                <GarmentDesignBoard layout={layout} className="mx-auto max-h-80 w-full object-contain" />
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-body text-sm font-semibold">{garmentName}</h2>
                    <p className="mt-1 text-xs text-charcoal">{layout.color || 'White'} · {layout.size || '—'} · {layout.textPlacement || 'front'}</p>
                    <p className="mt-1 text-xs text-charcoal">{design.status.replaceAll('_', ' ')}</p>
                  </div>
                  {design.customProduct?.id && <Link to={`/customize/${design.customProduct.id}`} className="shrink-0 text-xs font-semibold text-orange underline">Create another</Link>}
                </div>
              </article>
            );
          })}
          </div>}
          {designPageCount > 1 && (
            <nav className="flex items-center justify-center gap-2 pt-2" aria-label="Saved designs pagination">
              <button
                type="button"
                disabled={designPage === 1}
                onClick={() => setDesignPage((page) => Math.max(1, page - 1))}
                className="grid h-10 w-10 place-items-center rounded-full border border-ink/15 bg-white text-lg transition hover:border-cargo hover:text-cargo disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Previous page"
              >←</button>
              {Array.from({ length: designPageCount }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setDesignPage(page)}
                  aria-current={designPage === page ? 'page' : undefined}
                  aria-label={`Page ${page}`}
                  className={`grid h-10 w-10 place-items-center rounded-full border text-xs font-semibold transition ${designPage === page ? 'border-cargo bg-cargo text-chalk' : 'border-ink/15 bg-white text-charcoal hover:border-cargo hover:text-cargo'}`}
                >{page}</button>
              ))}
              <button
                type="button"
                disabled={designPage === designPageCount}
                onClick={() => setDesignPage((page) => Math.min(designPageCount, page + 1))}
                className="grid h-10 w-10 place-items-center rounded-full border border-ink/15 bg-white text-lg transition hover:border-cargo hover:text-cargo disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Next page"
              >→</button>
            </nav>
          )}
        </div>
      )}

      {tab === 'profile' && (
        <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <div className="border border-ink/10 bg-white p-6 shadow-soft md:p-8">
          <div className="mb-6">
            <h2 className="font-body text-lg font-semibold">Personal details</h2>
            <p className="mt-1 text-sm text-charcoal">Keep your contact details up to date for order updates.</p>
          </div>
          <form onSubmit={saveProfile} className="space-y-5">
            <Field label="Full name" name="fullName" value={profile.fullName} onChange={(event) => setProfile((current) => ({ ...current, fullName: event.target.value }))} required autoComplete="name" />
            <Field label="Phone number" name="phone" value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} required type="tel" autoComplete="tel" />
            <div>
              <span className="mb-2 block text-xs font-semibold text-charcoal">Email address</span>
              <input value={user.email} disabled className="min-h-11 w-full rounded-tile border border-ink/10 bg-paper px-3 py-2.5 text-sm text-charcoal" />
              <p className="mt-2 text-xs text-charcoal">To change your email, please contact customer support.</p>
            </div>
            <button disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save profile'}</button>
          </form>
        </div>
        <div className="border border-ink/10 bg-white p-6 shadow-soft md:p-8">
          <div className="mb-6">
            <h2 className="font-body text-lg font-semibold">Change password</h2>
            <p className="mt-1 text-sm text-charcoal">Use at least 12 characters for your new password.</p>
          </div>
          <form onSubmit={changePassword} className="space-y-5">
            <Field label="Write old password" name="currentPassword" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} required type="password" autoComplete="current-password" />
            <PasswordField label="Enter new password" name="newPassword" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} required visible={showNewPassword} onToggle={() => setShowNewPassword((visible) => !visible)} />
            <PasswordField label="Confirm new password" name="confirmPassword" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} required visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((visible) => !visible)} />
            <button disabled={busy} className="btn btn-primary">{busy ? 'Changing…' : 'Change password'}</button>
          </form>
        </div>
        </div>
      )}

      {tab === 'addresses' && (
        <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            {addresses.length === 0 && (
              <div className="border border-dashed border-ink/20 bg-white p-7">
                <h2 className="font-body text-base font-semibold">No saved addresses yet</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-charcoal">Add a delivery address once, then it will be ready for your next order.</p>
              </div>
            )}
            {addresses.map((address) => (
              <article key={address.id} className="border border-ink/10 bg-white p-5 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-body text-sm font-semibold">{address.label}</h2>
                      {address.isDefault && <span className="bg-[#e7e9e2] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em]">Default</span>}
                    </div>
                    <p className="mt-3 text-sm font-medium">{address.recipient}</p>
                    <p className="mt-1 text-sm leading-6 text-charcoal">{address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />{address.city}, {address.province}{address.postalCode ? ` ${address.postalCode}` : ''}<br />{address.country}</p>
                    <p className="mt-2 text-xs text-charcoal">{address.phone}</p>
                  </div>
                  <div className="flex gap-3 text-xs font-semibold">
                    <button type="button" onClick={() => startEditing(address)} className="underline underline-offset-4">Edit</button>
                    <button type="button" onClick={() => deleteAddress(address.id)} disabled={busy} className="text-red-700 underline underline-offset-4">Remove</button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <form onSubmit={saveAddress} className="space-y-5 border border-ink/10 bg-white p-6 shadow-soft md:p-7">
            <div>
              <h2 className="font-body text-lg font-semibold">{editingId ? 'Edit address' : 'Add a delivery address'}</h2>
              <p className="mt-1 text-sm text-charcoal">Fields marked with * are required.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Address label" name="label" value={addressForm.label} onChange={handleAddressChange} required />
              <Field label="Recipient name" name="recipient" value={addressForm.recipient} onChange={handleAddressChange} required autoComplete="name" />
              <Field label="Phone number" name="phone" value={addressForm.phone} onChange={handleAddressChange} required type="tel" autoComplete="tel" />
              <Field label="Country" name="country" value={addressForm.country} onChange={handleAddressChange} required autoComplete="country-name" />
              <Field label="Address line 1" name="line1" value={addressForm.line1} onChange={handleAddressChange} required wide autoComplete="address-line1" />
              <Field label="Address line 2 (optional)" name="line2" value={addressForm.line2} onChange={handleAddressChange} wide autoComplete="address-line2" />
              <Field label="City" name="city" value={addressForm.city} onChange={handleAddressChange} required autoComplete="address-level2" />
              <Field label="Province / region" name="province" value={addressForm.province} onChange={handleAddressChange} required autoComplete="address-level1" />
              <Field label="Postal code (optional)" name="postalCode" value={addressForm.postalCode} onChange={handleAddressChange} autoComplete="postal-code" />
            </div>
            <label className="flex items-center gap-2 text-sm text-charcoal">
              <input type="checkbox" name="isDefault" checked={addressForm.isDefault} onChange={handleAddressChange} className="h-4 w-4 accent-[#68745F]" />
              Make this my default delivery address
            </label>
            <div className="flex flex-wrap gap-3">
              <button disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : editingId ? 'Save changes' : 'Save address'}</button>
              {editingId && <button type="button" onClick={() => { setEditingId(null); setAddressForm(blankAddress); }} className="btn btn-secondary">Cancel</button>}
            </div>
          </form>
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-5">
          <div className="flex gap-2 overflow-x-auto border-b border-ink/10 pb-4" aria-label="Order status filters">
            {[
              ['ALL', 'All', orders.length],
              ...orderStatuses.map((status) => [status, status.replaceAll('_', ' '), statusCounts[status] || 0]),
            ].map(([status, label, count]) => (
              <button
                key={status}
                type="button"
                onClick={() => { setOrderStatus(status); setOrderPage(1); }}
                aria-pressed={orderStatus === status}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition ${orderStatus === status ? 'border-cargo bg-cargo text-chalk' : 'border-ink/15 bg-white text-charcoal hover:border-cargo hover:text-cargo'}`}
              >
                {label} <span className="ml-1 opacity-70">{count}</span>
              </button>
            ))}
          </div>

          {orders.length === 0 ? (
            <div className="border border-dashed border-ink/20 bg-white p-8">
              <h2 className="font-body text-base font-semibold">Your order history will appear here</h2>
              <p className="mt-2 text-sm text-charcoal">Orders placed while signed in to this account will be listed here.</p>
              <Link to="/shop" className="mt-5 inline-flex border-b border-ink/30 pb-1 text-xs font-semibold uppercase tracking-[0.12em]">Explore the collection</Link>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="border border-dashed border-ink/20 bg-white p-8 text-sm text-charcoal">No orders with this status yet.</div>
          ) : (
            <div className="space-y-3">
              {visibleOrders.map((order) => (
                <article key={order.orderNumber} className="flex flex-col gap-4 border border-ink/10 bg-white p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em]">{order.orderNumber}</p>
                    <p className="mt-1 text-xs text-charcoal">Placed {new Date(order.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <p className="mt-2 text-sm text-charcoal">{order.items.map((item) => `${item.nameSnapshot} × ${item.qty}`).join(', ')}</p>
                  </div>
                  <div className="flex items-center justify-between gap-5 sm:justify-end">
                    <div className="text-right">
                      <span className="inline-flex bg-[#e7e9e2] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em]">{order.status.replaceAll('_', ' ')}</span>
                      <p className="price-text mt-2 text-sm">{money(order.totalPaisa)}</p>
                      <button type="button" onClick={() => setSelectedOrder(order)} className="mt-3 border-b border-cargo pb-1 text-xs font-semibold uppercase tracking-[0.12em] text-cargo hover:text-orange">View order</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {orderPageCount > 1 && (
            <nav className="flex items-center justify-center gap-2 pt-2" aria-label="Orders pagination">
              <button type="button" disabled={orderPage === 1} onClick={() => setOrderPage((page) => Math.max(1, page - 1))} className="border border-ink/15 px-3 py-2 text-xs disabled:opacity-40">Previous</button>
              <span className="px-2 text-xs text-charcoal">Page {orderPage} of {orderPageCount}</span>
              <button type="button" disabled={orderPage === orderPageCount} onClick={() => setOrderPage((page) => Math.min(orderPageCount, page + 1))} className="border border-ink/15 px-3 py-2 text-xs disabled:opacity-40">Next</button>
            </nav>
          )}
        </div>
      )}
      {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </section>
  );
}

function OrderDetailsModal({ order, onClose }) {
  const address = order.shippingAddress || {};
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-cargo/70 p-4" role="dialog" aria-modal="true" aria-labelledby="account-order-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-card border-2 border-ink bg-cream shadow-soft">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-ink/15 bg-cream px-5 py-4 md:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cargo">Order details</p>
            <h2 id="account-order-title" className="mt-1 font-body text-2xl">{order.orderNumber}</h2>
            <p className="mt-1 text-xs text-charcoal">Placed {new Date(order.createdAt).toLocaleString('en-PK')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close order details" className="grid h-10 w-10 shrink-0 place-items-center border border-ink/20 text-xl hover:bg-cargo hover:text-chalk">×</button>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-[1fr_280px] md:p-7">
          <div className="space-y-4">
            {(order.items || []).map((item, index) => {
              const layout = item.design?.layoutJson || null;
              const image = item.variant?.product?.images?.[0]?.storageKey || '';
              return (
                <article key={`${item.skuSnapshot}-${index}`} className="grid gap-4 rounded-card border border-ink/15 bg-white p-4 sm:grid-cols-[180px_1fr]">
                  <div className="min-h-44 overflow-hidden border border-ink/10 bg-[#eceae2]">
                    {layout ? <GarmentDesignBoard layout={layout} className="h-full w-full min-h-44" /> : image ? <img src={image} alt={item.nameSnapshot} className="h-full w-full object-cover" /> : <div className="grid h-full min-h-44 place-items-center text-xs text-charcoal">No image</div>}
                  </div>
                  <div className="text-sm">
                    <h3 className="font-body text-lg font-semibold">{item.nameSnapshot}</h3>
                    <p className="mt-1 text-xs text-charcoal">SKU: {item.skuSnapshot || '—'}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                      <div><dt className="text-xs text-charcoal">Quantity</dt><dd className="font-semibold">{item.qty}</dd></div>
                      <div><dt className="text-xs text-charcoal">Size</dt><dd className="font-semibold">{item.size}</dd></div>
                      <div><dt className="text-xs text-charcoal">Colour</dt><dd className="font-semibold">{item.color}</dd></div>
                      <div><dt className="text-xs text-charcoal">Unit price</dt><dd className="price-text">{money(item.unitPricePaisa)}</dd></div>
                    </dl>
                    {layout && (
                      <div className="mt-4 border-t border-ink/10 pt-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-cargo">Custom design</p>
                        {layout.text && <p><strong>Text:</strong> {layout.text}</p>}
                        {layout.text && <p><strong>Font:</strong> {layout.textFont || 'Default'}</p>}
                        {layout.text && layout.textColorMode === 'gradient'
                          ? <p><strong>Text colour:</strong> Gradient {layout.textGradientStart} → {layout.textGradientEnd}</p>
                          : layout.text && <p><strong>Text colour:</strong> {layout.textColor || '#202020'}</p>}
                        {layout.textPlacement && <p><strong>Text placement:</strong> {layout.textPlacement}</p>}
                        {layout.imagePlacement && layout.imageData && <p><strong>Image placement:</strong> {layout.imagePlacement}</p>}
                        {layout.imageData && Number.isFinite(Number(layout.imageSizeInches)) && <p><strong>Image length:</strong> {layout.imageSizeInches} inches</p>}
                        {layout.text && Number.isFinite(Number(layout.textWidthInches)) && <p><strong>Text width:</strong> {layout.textWidthInches} inches</p>}
                        {String(item.size).toUpperCase() === 'XS' && layout.xsMeasurements && <p><strong>XS measurements:</strong> Length {layout.xsMeasurements.length}, Chest {layout.xsMeasurements.chest}</p>}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <aside className="h-fit border border-ink/15 bg-white p-4 text-sm">
            <h3 className="font-body text-base font-semibold">Order summary</h3>
            <div className="mt-3 space-y-2">
              <p className="flex justify-between gap-3"><span>Status</span><strong>{order.status.replaceAll('_', ' ')}</strong></p>
              <p className="flex justify-between gap-3"><span>Subtotal</span><strong className="price-text">{money(order.subtotalPaisa)}</strong></p>
              {Number(order.discountPaisa) > 0 && <p className="flex justify-between gap-3"><span>Discount</span><strong className="price-text">-{money(order.discountPaisa)}</strong></p>}
              <p className="flex justify-between gap-3"><span>Delivery</span><strong className="price-text">{money(order.shippingPaisa)}</strong></p>
              <p className="flex justify-between gap-3 border-t border-ink/10 pt-2"><span>Total</span><strong className="price-text">{money(order.totalPaisa)}</strong></p>
            </div>
            <h4 className="mt-5 font-semibold">Delivery address</h4>
            <address className="mt-1 not-italic text-charcoal">
              {[address.recipient, address.line1, address.line2, address.city, address.province, address.postalCode].filter(Boolean).join(', ')}
              {address.phone && <><br />{address.phone}</>}
            </address>
            {order.customerNotes && <><h4 className="mt-5 font-semibold">Order notes</h4><p className="mt-1 text-charcoal">{order.customerNotes}</p></>}
          </aside>
        </div>
      </div>
    </div>
  );
}

