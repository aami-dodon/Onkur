import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './features/layout/AppLayout';
import LoginPage from './features/auth/LoginPage';
import SignupPage from './features/auth/SignupPage';
import ProtectedRoute from './features/auth/ProtectedRoute';
import PublicOnlyRoute from './features/auth/PublicOnlyRoute';
import DashboardRouter from './features/dashboard/DashboardRouter';
import HomePage from './features/landing/HomePage';

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
