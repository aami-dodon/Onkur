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
    <div className="auth-page">
      <div className="auth-card" role="form">
        <div>
          <h2>Join the Onkur movement</h2>
          <p style={{ margin: 0, color: 'var(--muted-text)' }}>
            Create an account to discover events, earn eco-badges, and follow your impact story.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={values.name}
              onChange={handleChange}
              placeholder="Aanya Patel"
            />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={values.email}
              onChange={handleChange}
              placeholder="you@example.org"
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
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
            />
          </div>
          <div className="form-actions">
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating your account…' : 'Sign up'}
            </button>
          </div>
        </form>
        <p style={{ margin: 0, color: 'var(--muted-text)' }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
