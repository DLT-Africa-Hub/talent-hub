import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface EmailVerificationGuardProps {
  children: React.ReactNode;
}

/**
 * Guard component that redirects unverified users to email verification page
 * when trying to access profile setup/onboarding pages
 */
const EmailVerificationGuard: React.FC<EmailVerificationGuardProps> = ({
  children,
}) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  // Allow access to verification page itself and other non-profile pages
  const profileSetupPaths = ['/onboarding', '/company/onboarding'];
  const isProfileSetupPath = profileSetupPaths.some((path) =>
    location.pathname.startsWith(path)
  );

  if (isProfileSetupPath && !user.emailVerified) {
    // Redirect to email verification page
    return <Navigate to="/verify-email" replace />;
  }

  // Allow access to verification page itself
  if (location.pathname === '/verify-email') {
    return <>{children}</>;
  }

  return <>{children}</>;
};

export default EmailVerificationGuard;
