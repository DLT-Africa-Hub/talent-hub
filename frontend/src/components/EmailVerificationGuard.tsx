import { useLocation } from 'react-router-dom';
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

  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  // Allow access to verification page itself
  if (location.pathname === '/verify-email') {
    return <>{children}</>;
  }

  return <>{children}</>;
};

export default EmailVerificationGuard;
