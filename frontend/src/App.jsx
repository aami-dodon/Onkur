import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './features/layout/AppLayout';
import LoginPage from './features/auth/LoginPage';
import SignupPage from './features/auth/SignupPage';
import CheckEmailPage from './features/auth/CheckEmailPage';
import VerifyEmailPage from './features/auth/VerifyEmailPage';
import ProtectedRoute from './features/auth/ProtectedRoute';
import PublicOnlyRoute from './features/auth/PublicOnlyRoute';
import DashboardRouter from './features/dashboard/DashboardRouter';
import HomePage from './features/landing/HomePage';
import PublicGalleryPage from './features/event-gallery/PublicGalleryPage';

function App() {
  return (
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
  );
}

export default App;
