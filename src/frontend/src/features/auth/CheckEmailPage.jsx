import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useDocumentTitle from '../../lib/useDocumentTitle';
import { getConfiguredSupportEmail } from './supportEmail';

const STORAGE_KEY = 'onkur.signup.checkEmail';

function readStoredPayload() {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Failed to parse stored signup confirmation details', error);
    return null;
  }
}

export default function CheckEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const configuredSupportEmail = useMemo(() => getConfiguredSupportEmail(), []);

  const payload = useMemo(() => {
    if (location.state && typeof location.state === 'object') {
      return location.state;
    }
    return readStoredPayload();
  }, [location.state]);

  useEffect(() => {
    if (!payload) {
      navigate('/signup', { replace: true });
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to persist signup confirmation details', error);
    }
  }, [navigate, payload]);

  const emailAddress = payload?.email || '';
  const supportEmail = configuredSupportEmail || payload?.supportEmail || 'support@onkur.org';
  const message =
    payload?.message ||
    'We just sent you a confirmation link. Please verify your email to start exploring Onkur.';

  useDocumentTitle('Onkur | Confirm your email');

  if (!payload) {
    return null;
  }

  return (
    <div className="flex w-full justify-center px-4 pb-16 pt-10 sm:pt-14">
      <div className="w-full max-w-md rounded-[20px] bg-white p-6 text-center shadow-[0_16px_40px_rgba(47,133,90,0.15)] sm:p-8">
        <h2 className="font-display text-2xl font-semibold text-brand-green">Check your email</h2>
        <p className="mt-3 text-sm text-brand-muted sm:text-base">{message}</p>
        {emailAddress ? (
          <p className="mt-3 text-sm text-brand-forest sm:text-base">
            We sent the link to <span className="font-semibold">{emailAddress}</span>.
          </p>
        ) : null}
        <div className="mt-6 space-y-2 text-sm text-brand-muted">
          <p>
            If you can’t find the email within a few minutes, check your spam folder or request another link from the
            login page.
          </p>
          <p>
            Need help? Reach out to our admin at{' '}
            <a className="text-brand-green underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
            .
          </p>
        </div>
        <div className="mt-8 space-y-3">
          <Link
            to="/login"
            className="inline-flex w-full items-center justify-center rounded-md bg-brand-yellow px-4 py-2.5 text-base font-semibold text-brand-brown shadow-[0_6px_12px_rgba(236,201,75,0.3)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green/50"
          >
            Go to login
          </Link>
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="inline-flex w-full items-center justify-center rounded-md border border-brand-green/40 px-4 py-2.5 text-base font-semibold text-brand-green transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green/50"
          >
            Back to signup
          </button>
        </div>
      </div>
    </div>
  );
}
