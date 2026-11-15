import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Wordmark } from '../components/Wordmark.jsx';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/login', form);
      navigate('/admin', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to sign in. Check the API connection and try again.');
    } finally {
      setSubmitting(false);
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
    </main>
  );
}
