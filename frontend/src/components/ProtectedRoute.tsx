import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user } = useAuth();

  const token =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('token')
      : null;
  const storedUser =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('user')
      : null;
  const isAuth = isAuthenticated || (token && storedUser);

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  // Get user from context or localStorage
  const currentUser = user || (storedUser ? JSON.parse(storedUser) : null);

  if (currentUser && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
