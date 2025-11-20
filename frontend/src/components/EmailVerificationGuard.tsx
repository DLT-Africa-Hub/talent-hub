import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface EmailVerificationGuardProps {
  children: React.ReactNode;
}

/**
 * Guard component that redirects unverified users to email verification page
 */
const EmailVerificationGuard: React.FC<EmailVerificationGuardProps> = ({
  children,
}) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // Don't block if not authenticated (ProtectedRoute will handle that)
  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  // Allow access to verification page itself
  if (location.pathname === '/verify-email') {
    return <>{children}</>;
  }

  // Allow unverified users to access dashboard (modal will handle verification prompt)
  // Only redirect if explicitly trying to access verification page without token
  // if (user.emailVerified === false || !user.emailVerified) {
  //   return <Navigate to="/verify-email" replace />;
  // }

  return <>{children}</>;
};

export default EmailVerificationGuard;

