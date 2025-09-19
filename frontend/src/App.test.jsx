import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('./features/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock('./features/auth/ProtectedRoute', () => ({
  default: ({ children }) => <div data-testid="protected-route">{children}</div>,
}));

vi.mock('./features/auth/PublicOnlyRoute', () => ({
  default: ({ children }) => <div data-testid="public-only-route">{children}</div>,
}));

vi.mock('./features/dashboard/DashboardRouter', () => ({
  default: () => <div>Dashboard router</div>,
}));

vi.mock('./features/auth/LoginPage', () => ({
  default: () => <div>Login page</div>,
}));

vi.mock('./features/auth/SignupPage', () => ({
  default: () => <div>Signup page</div>,
}));

vi.mock('./features/auth/CheckEmailPage', () => ({
  default: () => <div>Check email page</div>,
}));

vi.mock('./features/auth/VerifyEmailPage', () => ({
  default: () => <div>Verify email page</div>,
}));

vi.mock('./features/event-gallery/PublicGalleryPage', () => ({
  default: () => <div>Public gallery page</div>,
}));

vi.mock('./features/landing/HomePage', () => ({
  default: () => <div>Home page content</div>,
}));

vi.mock('./features/auth/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

describe('App routing', () => {
  it('renders the gallery route inside the shared layout', async () => {
    render(
      <MemoryRouter initialEntries={['/gallery']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText('Public gallery page')).toBeInTheDocument();
    expect(screen.getByTestId('app-layout')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-route')).not.toBeInTheDocument();
  });
});
