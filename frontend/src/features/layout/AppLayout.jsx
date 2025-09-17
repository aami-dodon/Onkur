import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
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
            <h1>Onkur</h1>
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
          ) : null}
        </div>
      </header>
      <main className="app-main">
        <div className="app-content">{children}</div>
      </main>
      {isAuthenticated ? <BottomNav active={activeNav} /> : null}
    </div>
  );
}
