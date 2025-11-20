import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { useState } from 'react';

interface EmailVerificationBannerProps {
  onOpenModal: () => void;
}

const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  onOpenModal,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(false);

  const handleRequestVerification = async () => {
    if (cooldown || loading) return;
    
    setLoading(true);
    setError('');
    try {
      await authApi.requestEmailVerification();
      setSuccess(true);
      setCooldown(true);
      // Show success for 3 seconds, then disable for 60 seconds to prevent spam
      setTimeout(() => setSuccess(false), 3000);
      setTimeout(() => setCooldown(false), 60000); // 60 second cooldown
    } catch (err: any) {
      console.error('Request verification error:', err);
      if (err.response?.status === 429) {
        setError('Too many requests. Please wait a moment before trying again.');
        setCooldown(true);
        setTimeout(() => {
          setCooldown(false);
          setError('');
        }, 60000); // 60 second cooldown on rate limit
      } else {
        setError(err.response?.data?.message || 'Failed to send email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Don't show if user is verified
  if (user?.emailVerified) {
    return null;
  }

  return (
    <div className="w-full bg-yellow-50 border-b-2 border-yellow-400 px-4 py-3 z-50 sticky top-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">
              Please verify your email to access all features
            </p>
            {user?.email && (
              <p className="text-xs text-yellow-700 mt-0.5">{user.email}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-600 font-medium max-w-[200px]">
              {error}
            </span>
          )}
          {success && !error && (
            <span className="text-xs text-green-600 font-medium">
              Email sent!
            </span>
          )}
          <button
            onClick={handleRequestVerification}
            disabled={loading || success || cooldown}
            className="px-4 py-1.5 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : success ? 'Sent!' : cooldown ? 'Wait...' : 'Send Email'}
          </button>
          <button
            onClick={onOpenModal}
            className="px-4 py-1.5 bg-white border border-yellow-600 text-yellow-700 text-sm font-medium rounded-md hover:bg-yellow-50 transition-colors"
          >
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;

