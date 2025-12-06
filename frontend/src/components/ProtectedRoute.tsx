import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ReactNode, useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  // Give AuthContext time to initialize from sessionStorage
  useEffect(() => {
    // Small delay to ensure AuthContext has loaded
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const token =
    typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  const storedUser =
    typeof window !== 'undefined' ? sessionStorage.getItem('user') : null;

  // Check both AuthContext and sessionStorage
  const isAuth = isAuthenticated || (token && storedUser);
  const currentUser = user || (storedUser ? JSON.parse(storedUser) : null);

  // Don't redirect while checking initial auth state
  if (isChecking) {
    return null; // Or return a loading spinner
  }

  if (!isAuth) {
    console.log('ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (currentUser && !allowedRoles.includes(currentUser.role)) {
    console.log('ProtectedRoute: Wrong role, redirecting to home');
    return <Navigate to="/" replace />;
  }

  console.log('ProtectedRoute: Authorized, rendering children');
  return <>{children}</>;
};

export default ProtectedRoute;
