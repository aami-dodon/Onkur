import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../../lib/apiClient';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token'), [searchParams]);
  const [status, setStatus] = useState(token ? 'pending' : 'missing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (!token) {
      setStatus('missing');
      setMessage('We could not find a verification token. Please use the link from your email.');
      return () => {
        isMounted = false;
      };
    }

    (async () => {
      try {
        setStatus('pending');
        const response = await apiRequest('/api/auth/verify-email', {
          method: 'POST',
          body: { token },
        });
        if (!isMounted) return;
        setStatus('success');
        setMessage(response.message || 'Your email has been verified. You can now log in.');
      } catch (error) {
        if (!isMounted) return;
        setStatus('error');
        setMessage(error.message || 'We could not verify your email.');
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const heading = useMemo(() => {
    if (status === 'success') return 'Email verified!';
    if (status === 'error') return 'Verification failed';
    if (status === 'missing') return 'Verification link missing';
    return 'Verifying your email…';
  }, [status]);

  return (
    <div className="flex w-full justify-center px-4 pb-16 pt-10 sm:pt-14">
      <div className="w-full max-w-md rounded-[20px] bg-white p-6 text-center shadow-[0_16px_40px_rgba(47,133,90,0.15)] sm:p-8">
        <h2 className="font-display text-2xl font-semibold text-brand-green">{heading}</h2>
        <p className="mt-3 text-sm text-brand-muted sm:text-base">{message}</p>
        {status === 'success' ? (
          <div className="mt-6 space-y-3">
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center rounded-md bg-brand-yellow px-4 py-2.5 text-base font-semibold text-brand-brown shadow-[0_6px_12px_rgba(236,201,75,0.3)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green/50"
            >
              Go to login
            </Link>
          </div>
        ) : null}
        {status === 'error' || status === 'missing' ? (
          <div className="mt-6 space-y-2 text-sm text-brand-muted">
            <p>
              Need a new link? Try signing in to request another verification email or{' '}
              <a className="text-brand-green underline" href="mailto:support@onkur.org">
                contact support
              </a>
              .
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
