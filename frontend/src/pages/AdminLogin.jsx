import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Wordmark } from '../components/Wordmark.jsx';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await api.post('/auth/login', form);
      if (!response.data.data?.verificationRequired) {
        throw new Error('The verification step could not be started. Please try again.');
      }
      setForm((current) => ({ ...current, password: '' }));
      setVerificationCode('');
      setVerificationError('');
      setVerificationRequired(true);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to sign in. Check the API connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerification = async (event) => {
    event.preventDefault();
    setVerificationError('');
    setVerifying(true);
    try {
      await api.post('/auth/verify-login-code', { code: verificationCode });
      setVerificationRequired(false);
      navigate('/admin', { replace: true });
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        setVerificationRequired(false);
        setVerificationCode('');
        setForm((current) => ({ ...current, password: '' }));
        setError(requestError.response?.data?.error?.message || 'The verification code was incorrect or expired. Please sign in again.');
        navigate('/admin/login', { replace: true });
      } else {
        setVerificationError(requestError.response?.data?.error?.message || 'Could not verify the code. Please try again.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const cancelVerification = async () => {
    setVerificationError('');
    setVerifying(true);
    try {
      await api.post('/auth/cancel-login-verification');
      setVerificationRequired(false);
      setVerificationCode('');
      setError('');
    } catch (requestError) {
      setVerificationError(requestError.response?.data?.error?.message || 'Could not cancel verification. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <main className="admin-shell grid min-h-screen place-items-center bg-paper px-4 py-10 text-ink">
      <section className="w-full max-w-md border border-ink/15 bg-chalk p-8 shadow-soft sm:p-11">
        <Wordmark className="mb-10" />
        <h1 className="display-m">Admin sign in</h1>
        <p className="mt-2 text-[0.9375rem] text-stone">Studio access for authorised staff.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="admin-email" className="field-label">Email</label>
            <input id="admin-email" autoComplete="username" required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="field" />
          </div>
          <div>
            <label htmlFor="admin-password" className="field-label">Password</label>
            <input id="admin-password" autoComplete="current-password" required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="field" />
          </div>
          {error && <p role="alert" className="notice-error">{error}</p>}
          <button type="submit" disabled={submitting} className="btn btn-primary w-full">
            {submitting ? 'Signing in…' : 'Sign in to admin'}
          </button>
        </form>
        <Link to="/" className="link-line mt-8 text-[0.9375rem]">Back to storefront</Link>
      </section>
      {verificationRequired && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-cargo/75 p-4" role="dialog" aria-modal="true" aria-labelledby="admin-verification-title" aria-describedby="admin-verification-description">
          <section className="w-full max-w-md border-2 border-ink bg-cream p-6 shadow-soft sm:p-8">
            <h2 id="admin-verification-title" className="text-2xl">Verify your sign-in</h2>
            <p id="admin-verification-description" className="mt-3 text-sm leading-6 text-charcoal">
              Enter the code sent to the registered email address. It expires in 5 minutes.
            </p>
            <form onSubmit={handleVerification} className="mt-6 space-y-4">
              <label htmlFor="admin-verification-code" className="field-label">6-digit verification code</label>
              <input
                id="admin-verification-code"
                autoComplete="one-time-code"
                autoFocus
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="field text-center text-2xl tracking-[0.45em]"
                aria-describedby={verificationError ? 'admin-verification-error' : undefined}
              />
              {verificationError && <p id="admin-verification-error" role="alert" className="notice-error">{verificationError}</p>}
              <div className="flex flex-wrap justify-end gap-3">
                <button type="button" disabled={verifying} onClick={cancelVerification} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={verifying || verificationCode.length !== 6} className="btn btn-primary">
                  {verifying ? 'Verifying…' : 'Verify code'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
