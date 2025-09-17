import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

const initialState = {
  email: '',
  password: '',
};

export default function LoginPage() {
  const { login } = useAuth();
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
      await login(values);
    } catch (err) {
      setError(err.message || 'We could not log you in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-card" role="form">
      <div>
        <h2>Welcome back to Onkur</h2>
        <p style={{ margin: 0, color: 'var(--muted-text)' }}>
          Reconnect with the community and track the impact you are creating.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="auth-form">
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
            autoComplete="current-password"
            required
            value={values.password}
            onChange={handleChange}
            placeholder="••••••••"
          />
        </div>
        <div className="form-actions">
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Signing you in…' : 'Log in'}
          </button>
        </div>
      </form>
      <p style={{ margin: 0, color: 'var(--muted-text)' }}>
        New to Onkur? <Link to="/signup">Create an account</Link>
      </p>
    </div>
  );
}
