import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LoadingScreen from '../layout/LoadingScreen';

export default function ProtectedRoute({ children }) {
  const { status, isAuthenticated } = useAuth();

  if (status === 'loading') {
    return <LoadingScreen label="Preparing your dashboard" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
