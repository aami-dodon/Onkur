import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LoadingScreen from '../layout/LoadingScreen';

export default function PublicOnlyRoute({ children }) {
  const { status, isAuthenticated } = useAuth();

  if (status === 'loading') {
    return <LoadingScreen label="Checking your session" />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}
