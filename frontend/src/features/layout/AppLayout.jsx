import { useEffect, useMemo } from 'react';

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import BottomNav from './BottomNav';

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

  useEffect(() => {
    const path = location.pathname;
    let title = 'Onkur';

    if (path === '/') {
      title = 'Onkur | Nature · Sustainability · Community';
    } else if (path.startsWith('/login')) {
      title = 'Sign in | Onkur';
    } else if (path.startsWith('/signup')) {
      title = 'Join Onkur | Mobile-first volunteering';
    } else if (path.startsWith('/app')) {
      if (user?.role) {
        title = `${formatRole(user.role)} Dashboard | Onkur`;
      } else {
        title = 'Onkur Dashboard';
      }
    }

    document.title = title;
  }, [location.pathname, user]);

  const activeNav = useMemo(() => {
    if (location.pathname.startsWith('/gallery')) return 'gallery';
    if (location.pathname.startsWith('/events')) return 'events';
    if (location.pathname.startsWith('/profile')) return 'profile';
    return 'home';
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__top">
        <div className="app-header__brand">
          <h1>
            <Link to="/" className="app-header__brand-link" aria-label="Go to the Onkur home page">
              Onkur
            </Link>
          </h1>
          <p>{headerSubtitle}</p>
        </div>
          {user ? (
            <div className="app-header__meta">
              <span>{user.name}</span>
              <span className="role-badge">{formatRole(user.role)}</span>
              <button type="button" className="btn-secondary" onClick={logout}>
                Log out
              </button>
            </div>
          ) : (
            <nav className="app-header__actions">
              <Link to="/login" className="header-link">
                Sign in
              </Link>
              <Link to="/signup" className="header-link header-link--primary">
                Join Onkur
              </Link>
            </nav>
          )}
        </div>
      </header>
      <main className="app-main">
        <div className="app-content">{children}</div>
      </main>
      {isAuthenticated ? <BottomNav active={activeNav} /> : null}
    </div>
  );
}
