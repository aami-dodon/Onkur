import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './features/auth/ProtectedRoute';
import PublicOnlyRoute from './features/auth/PublicOnlyRoute';
import LoadingScreen from './features/layout/LoadingScreen';

const AppLayout = lazy(() => import('./features/layout/AppLayout'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const SignupPage = lazy(() => import('./features/auth/SignupPage'));
const CheckEmailPage = lazy(() => import('./features/auth/CheckEmailPage'));
const VerifyEmailPage = lazy(() => import('./features/auth/VerifyEmailPage'));
const DashboardRouter = lazy(() => import('./features/dashboard/DashboardRouter'));
const HomePage = lazy(() => import('./features/landing/HomePage'));
const PublicGalleryPage = lazy(() => import('./features/event-gallery/PublicGalleryPage'));

function App() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading Onkur…" />}>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/gallery" element={<PublicGalleryPage />} />
          <Route
            path="/app/*"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicOnlyRoute>
                <SignupPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/check-email"
            element={
              <PublicOnlyRoute>
                <CheckEmailPage />
              </PublicOnlyRoute>
            }
          />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </Suspense>
  );
}

export default App;
