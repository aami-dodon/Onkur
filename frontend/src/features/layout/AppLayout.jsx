import { useMemo } from 'react';

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import BottomNav from './BottomNav';
import DesktopNav from './DesktopNav';

function formatRole(role) {
  if (!role) return '';
  return role
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export default function AppLayout({ children }) {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  const headerSubtitle = useMemo(() => {
    if (!isAuthenticated) {
      return 'Rooted in nature. Built for community action.';
    }
    return 'Cultivate impact through every event, pledge, and story.';
  }, [isAuthenticated]);

  const activeNav = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/app/gallery') || path.startsWith('/gallery')) return 'gallery';
    if (path.startsWith('/app/events') || path.startsWith('/events')) return 'events';
    if (path.startsWith('/app/profile') || path.startsWith('/profile')) return 'profile';
    if (path.startsWith('/app')) return 'home';
    return 'home';
  }, [location.pathname]);

  const formattedRoles = useMemo(() => {
    if (!user) return [];
    if (Array.isArray(user.roles) && user.roles.length) {
      return user.roles.map((role) => formatRole(role));
    }
    return user.role ? [formatRole(user.role)] : [];
  }, [user]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-green/10 via-brand-sand to-brand-sand">
      <header className="sticky top-0 z-10 bg-brand-green text-white shadow-[0_8px_16px_rgba(47,133,90,0.25)]">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <h1 className="m-0 text-2xl font-semibold tracking-tight text-white">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 font-display text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/80"
                aria-label="Go to the Onkur home page"
              >
                Onkur
              </Link>
            </h1>
            <p className="m-0 text-sm text-white/85 sm:text-base">{headerSubtitle}</p>
          </div>
          {user ? (
            <div className="flex w-full flex-col items-center gap-2 text-sm sm:w-auto sm:items-end">
              <span className="text-base font-medium">{user.name}</span>
              {formattedRoles.length ? (
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                  {formattedRoles.join(' • ')}
                </span>
              ) : null}
              <button
                type="button"
                className="rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
                onClick={logout}
              >
                Log out
              </button>
            </div>
          ) : (
            <nav className="flex w-full items-center justify-center gap-3 pt-2 sm:w-auto sm:justify-end">
              <Link
                to="/login"
                className="rounded-md border border-white/50 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,63,37,0.15)] transition hover:-translate-y-0.5 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="rounded-md border border-white bg-white px-4 py-2 text-sm font-semibold text-brand-green shadow-[0_14px_30px_rgba(12,58,33,0.28)] transition hover:-translate-y-0.5 hover:bg-white/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              >
                Join Onkur
              </Link>
            </nav>
          )}
        </div>
        {isAuthenticated ? <DesktopNav active={activeNav} /> : null}
      </header>
      <main className="flex-1 px-5 pb-16 pt-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">{children}</div>
      </main>
      {isAuthenticated ? <BottomNav active={activeNav} /> : null}
    </div>
  );
}
