import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

const initialState = {
  name: '',
  email: '',
  password: '',
};

export default function SignupPage() {
  const { signup } = useAuth();
  const [values, setValues] = useState(initialState);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await signup(values);
    } catch (err) {
      setError(err.message || 'We could not create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex w-full justify-center px-4 pb-16 pt-10 sm:pt-14">
      <div
        className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-[0_16px_40px_rgba(47,133,90,0.15)] sm:p-8"
        role="form"
      >
        <div className="space-y-2 text-center sm:text-left">
          <h2 className="m-0 font-display text-2xl font-semibold text-brand-green">Join the Onkur movement</h2>
          <p className="m-0 text-sm text-brand-muted sm:text-base">
            Create an account to discover events, earn eco-badges, and follow your impact story.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-muted" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={values.name}
              onChange={handleChange}
              placeholder="Aanya Patel"
              className="w-full rounded-md border border-brand-green/40 bg-white/90 px-3 py-3 text-base shadow-sm transition focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/40"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-muted" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={values.email}
              onChange={handleChange}
              placeholder="you@example.org"
              className="w-full rounded-md border border-brand-green/40 bg-white/90 px-3 py-3 text-base shadow-sm transition focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/40"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-muted" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={values.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
              minLength={8}
              className="w-full rounded-md border border-brand-green/40 bg-white/90 px-3 py-3 text-base shadow-sm transition focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/40"
            />
          </div>
          <div className="space-y-3 pt-2">
            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-md bg-brand-yellow px-4 py-2.5 text-base font-semibold text-brand-brown shadow-[0_6px_12px_rgba(236,201,75,0.3)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green/50 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? 'Creating your account…' : 'Sign up'}
            </button>
          </div>
        </form>
        <p className="mt-6 text-center text-sm text-brand-muted sm:text-left">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
