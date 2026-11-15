import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { GoogleSignIn } from '../components/GoogleSignIn.jsx';

export default function AuthPage({ mode = 'login' }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const showToast = useToast();
  const isRegister = mode === 'register';
  const resetToken = searchParams.get('token') || '';
  const returnTo = searchParams.get('returnTo');
  const destination = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/account';
  const sessionMessage = searchParams.get('reason') === 'account-blocked'
    ? 'Your account has been blocked by the team. Please contact us for further queries.'
    : searchParams.get('reason') === 'session-ended'
      ? 'Your session has ended. Please sign in again.'
      : '';

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post(`/account/${isRegister ? 'register' : 'login'}`, form);
      window.dispatchEvent(new Event('zavikoo:customer-session-created'));
      navigate(destination, { replace: true });
    } catch (requestError) {
      const message = requestError.response?.data?.error?.message || 'Unable to sign in. Please try again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async (credential) => {
    setError('');
    setBusy(true);
    try {
      await api.post('/account/google', { credential });
      window.dispatchEvent(new Event('zavikoo:customer-session-created'));
      navigate(destination, { replace: true });
    } catch (requestError) {
      const message = requestError.response?.data?.error?.message || 'Google sign-in could not be completed. Please try again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const requestPasswordReset = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const response = await api.post('/account/password/forgot', { email: form.email });
      setNotice(response.data.data.message);
    } catch (requestError) {
      const message = requestError.response?.data?.error?.message || 'Unable to request a password reset. Please try again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!resetToken) {
      setError('This password reset link is invalid or has expired. Request a new one to continue.');
      return;
    }
    if (form.password.length < 12) {
      setError('Use a password of at least 12 characters.');
      return;
    }
    if (form.confirmPassword !== form.password) {
      setError('The passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const response = await api.post('/account/password/reset', { token: resetToken, password: form.password });
      setNotice(response.data.data.message);
    } catch (requestError) {
      const message = requestError.response?.data?.error?.message || 'Unable to reset your password. Request a new link and try again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'forgot') {
    return (
      <section className="page py-16 md:py-24">
        <div className="mx-auto max-w-lg border border-ink/15 bg-chalk p-8 md:p-10">
          <h1 className="display-m">Forgot your password?</h1>
          <p className="mt-4 leading-7 text-stone">Enter your account email and we’ll send you a secure password reset link.</p>
          {notice && <p className="mt-5 border border-olive/20 bg-olive/5 px-4 py-3 text-sm text-cargo" role="status">{notice}</p>}
          {error && <p className="mt-5 border border-red-900/20 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
          {!notice && (
            <form onSubmit={requestPasswordReset} className="mt-8 space-y-5">
              <div>
                <label className="field-label" htmlFor="forgot-email">Email address</label>
                <input id="forgot-email" autoComplete="email" required maxLength={191} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="field" />
              </div>
              <button disabled={busy} className="btn btn-primary w-full">{busy ? 'Please wait…' : 'Send reset link'}</button>
            </form>
          )}
          <Link to="/login" className="link-line mt-8">Back to sign in</Link>
        </div>
      </section>
    );
  }

  if (mode === 'reset') {
    return (
      <section className="page py-16 md:py-24">
        <div className="mx-auto max-w-lg border border-ink/15 bg-chalk p-8 md:p-10">
          <h1 className="display-m">Set a new password</h1>
          <p className="mt-4 leading-7 text-stone">Choose a new password with at least 12 characters.</p>
          {notice && <p className="mt-5 border border-olive/20 bg-olive/5 px-4 py-3 text-sm text-cargo" role="status">{notice}</p>}
          {error && <p className="mt-5 border border-red-900/20 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
          {!notice && resetToken && (
            <form onSubmit={resetPassword} className="mt-8 space-y-5">
              <div>
                <label className="field-label" htmlFor="reset-password">New password</label>
                <input id="reset-password" autoComplete="new-password" required minLength={12} maxLength={256} type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className="field" />
              </div>
              <div>
                <label className="field-label" htmlFor="reset-confirm-password">Confirm new password</label>
                <input id="reset-confirm-password" autoComplete="new-password" required minLength={12} maxLength={256} type="password" value={form.confirmPassword || ''} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} className="field" />
              </div>
              <button disabled={busy} className="btn btn-primary w-full">{busy ? 'Please wait…' : 'Update password'}</button>
            </form>
          )}
          {!resetToken && !notice && <Link to="/forgot-password" className="btn btn-primary mt-8">Request a new reset link</Link>}
          {notice && <Link to="/login" className="btn btn-primary mt-8">Back to sign in</Link>}
        </div>
      </section>
    );
  }

  if (!['login', 'register'].includes(mode)) return null;

  return (
    <section className="page py-12 md:py-20">
      <div className="mx-auto grid max-w-5xl overflow-hidden border border-ink/15 bg-chalk md:grid-cols-[0.85fr_1.15fr]">
        <div aria-hidden="true" className="on-dark hidden flex-col justify-between bg-cargo p-10 text-sand md:flex">
          <span className="stencil text-[2.4rem] leading-none tracking-[0.06em]">ZAVIKOO</span>
          <div>
            <div className="mb-5 h-px w-12 bg-brass" />
            <p className="font-display text-[1.9rem] leading-tight text-chalk">{isRegister ? 'Keep your details, designs and orders in one place.' : 'Your orders and saved designs, waiting for you.'}</p>
          </div>
        </div>

        <div className="p-7 sm:p-10 md:p-12">
          <h1 className="display-m">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
          <p className="mt-3 leading-7 text-stone">{isRegister ? 'Save your details, delivery addresses and order history.' : 'Sign in to manage your profile and orders.'}</p>
          {sessionMessage && <p className="mt-5 border border-red-900/20 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{sessionMessage}</p>}

          <form onSubmit={submit} className="mt-8 space-y-5">
            {isRegister && (
              <>
          <div>
                  <label className="field-label" htmlFor="auth-fullName">Full name</label>
                  <input id="auth-fullName" autoComplete="name" required minLength={2} maxLength={191} type="text" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} className="field" />
                </div>
          <div>
                  <label className="field-label" htmlFor="auth-phone">Phone number</label>
                  <input id="auth-phone" autoComplete="tel" required minLength={7} maxLength={40} type="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="field" />
                </div>
              </>
            )}
          <div>
              <label className="field-label" htmlFor="auth-email">Email address</label>
              <input id="auth-email" autoComplete="email" required maxLength={191} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="field" />
            </div>
            <div>
              <label className="field-label" htmlFor="auth-password">Password</label>
              <input id="auth-password" autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 12 : 1} maxLength={256} type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className="field" />
              {isRegister && <p className="field-hint">Use at least 12 characters.</p>}
            </div>
            {!isRegister && <div className="-mt-2 text-right"><Link to="/forgot-password" className="text-sm font-semibold text-cargo underline underline-offset-4">Forgot password?</Link></div>}
            <button disabled={busy} className="btn btn-primary w-full">{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}</button>
          </form>
          <div className="my-7 flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone" aria-hidden="true">
            <span className="h-px flex-1 bg-ink/15" />or<span className="h-px flex-1 bg-ink/15" />
          </div>
          <GoogleSignIn onCredential={signInWithGoogle} disabled={busy} />
          <p className="mt-7 text-[0.9375rem] text-stone">
            {isRegister ? 'Already have an account?' : 'New to ZAVIKOO?'}{' '}
            <Link to={`/${isRegister ? 'login' : 'register'}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`} className="font-semibold text-cargo underline underline-offset-4">{isRegister ? 'Sign in' : 'Create an account'}</Link>
          </p>
          <Link to="/" className="link-line mt-6 text-[0.9375rem]">Back to the store</Link>
        </div>
      </div>
    </section>
  );
}
