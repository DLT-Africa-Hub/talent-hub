import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ReactNode } from 'react';

/**
 * GuestRoute - Prevents authenticated users from accessing public routes like login/register.
 * Redirects them to their appropriate dashboard based on their role.
 */
interface GuestRouteProps {
  children: ReactNode;
}

const GuestRoute: React.FC<GuestRouteProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  const token =
    typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  const storedUser =
    typeof window !== 'undefined' ? sessionStorage.getItem('user') : null;
  const isAuth = isAuthenticated || (token && storedUser);

  // If not authenticated, allow access to login/register pages
  if (!isAuth) {
    return <>{children}</>;
  }

  // If authenticated, redirect to appropriate dashboard
  const currentUser = user || (storedUser ? JSON.parse(storedUser) : null);

  if (currentUser?.role === 'graduate') {
    return <Navigate to="/graduate" replace />;
  }

  if (currentUser?.role === 'company') {
    return <Navigate to="/company" replace />;
  }

  if (currentUser?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Fallback to home if role is unknown
  return <Navigate to="/" replace />;
};

export default GuestRoute;

