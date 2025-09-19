import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import useDocumentTitle from '../../lib/useDocumentTitle';
import { useAuth } from './AuthContext';
import { getConfiguredSupportEmail } from './supportEmail';

const initialState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const CHECK_EMAIL_STORAGE_KEY = 'onkur.signup.checkEmail';

export default function SignupPage() {
  const { signup, roles: availableRoles } = useAuth();
  const [values, setValues] = useState(initialState);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  useDocumentTitle('Onkur | Join the Onkur movement');
  const configuredSupportEmail = useMemo(() => getConfiguredSupportEmail(), []);

  const selectableRoles = useMemo(
    () => availableRoles.filter((role) => role !== 'ADMIN'),
    [availableRoles]
  );

  const roleQuery = searchParams.get('role');

  useEffect(() => {
    if (!selectableRoles.length) {
      setSelectedRoles([]);
      return;
    }

    if (roleQuery && selectableRoles.includes(roleQuery)) {
      setSelectedRoles((prev) => {
        if (prev.length === 1 && prev[0] === roleQuery) {
          return prev;
        }
        return [roleQuery];
      });
      return;
    }

    setSelectedRoles((prev) => {
      if (prev.length) {
        return prev.filter((role) => selectableRoles.includes(role));
      }
      return [selectableRoles[0]];
    });
  }, [selectableRoles, roleQuery]);

  const ROLE_DETAILS = useMemo(
    () => ({
      VOLUNTEER: {
        label: 'Volunteer',
        description: 'Join hands-on projects and power community impact on the ground.',
      },
      EVENT_MANAGER: {
        label: 'Event manager',
        description: 'Plan gatherings, coordinate teams, and keep every eco-moment on track.',
      },
      SPONSOR: {
        label: 'Sponsor',
        description: 'Fund initiatives, unlock resources, and accelerate regenerative ideas.',
      },
    }),
    []
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const toggleRole = (role) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        return prev.filter((entry) => entry !== role);
      }
      return [...prev, role];
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    if (values.password !== values.confirmPassword) {
      setError('Passwords do not match.');
      setSubmitting(false);
      return;
    }

    if (!selectedRoles.length) {
      setError('Choose at least one role to tailor your Onkur experience.');
      setSubmitting(false);
      return;
    }

    try {
      const result = await signup({
        name: values.name,
        email: values.email,
        password: values.password,
        roles: selectedRoles,
      });
      const requiresVerification = result && result.requiresEmailVerification;
      const supportEmail =
        configuredSupportEmail || (result && result.supportEmail ? result.supportEmail : null);
      const responseMessage =
        (result && result.message) || 'Account created. Check your inbox to verify your email.';

      setValues(initialState);
      setSelectedRoles(selectableRoles.length ? [selectableRoles[0]] : []);

      if (requiresVerification) {
        const payload = {
          email: values.email,
          message: responseMessage,
          supportEmail,
        };
        if (typeof window !== 'undefined') {
          try {
            window.sessionStorage.setItem(CHECK_EMAIL_STORAGE_KEY, JSON.stringify(payload));
          } catch (storageError) {
            console.warn('Unable to persist signup confirmation details', storageError);
          }
        }
        navigate('/check-email', { replace: true, state: payload });
        return;
      }

      setSuccess(responseMessage);
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
          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-muted" htmlFor="confirmPassword">
              Re-enter password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={values.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              minLength={8}
              className="w-full rounded-md border border-brand-green/40 bg-white/90 px-3 py-3 text-base shadow-sm transition focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/40"
            />
          </div>
          <fieldset className="space-y-3 rounded-lg border border-brand-green/30 bg-brand-sand/20 px-4 py-4">
            <legend className="px-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand-muted">
              Choose your roles
            </legend>
            <p className="m-0 text-sm text-brand-muted">
              Pick all the ways you want to show up—switching paths later is always possible.
            </p>
            <div className="space-y-3">
              {selectableRoles.map((role) => {
                const detail = ROLE_DETAILS[role] || { label: role, description: '' };
                const inputId = `role-${role.toLowerCase()}`;
                const checked = selectedRoles.includes(role);
                return (
                  <label
                    key={role}
                    htmlFor={inputId}
                    className={`flex cursor-pointer flex-col gap-1 rounded-md border px-3 py-3 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-green/50 ${
                      checked ? 'border-brand-green bg-white shadow-[0_10px_22px_rgba(47,133,90,0.12)]' : 'border-brand-green/30 bg-white/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-base font-semibold text-brand-forest">{detail.label}</span>
                      <input
                        id={inputId}
                        type="checkbox"
                        name="roles"
                        value={role}
                        checked={checked}
                        onChange={() => toggleRole(role)}
                        className="h-4 w-4 rounded border-brand-green text-brand-green focus:ring-brand-green"
                      />
                    </div>
                    {detail.description ? (
                      <span className="text-sm text-brand-muted">{detail.description}</span>
                    ) : null}
                  </label>
                );
              })}
              {selectableRoles.length === 0 ? (
                <p className="text-sm text-brand-muted">Roles are loading…</p>
              ) : null}
            </div>
          </fieldset>
          <div className="space-y-3 pt-2">
            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
            {success ? <p className="text-sm font-medium text-brand-green">{success}</p> : null}
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
