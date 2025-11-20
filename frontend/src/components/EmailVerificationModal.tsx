import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import Modal from './auth/Modal';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onDismiss?: () => void; // Called when user clicks "I'll verify later"
}

const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  onClose,
  onDismiss,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldown, setCooldown] = useState(false);

  const handleRequestVerification = async () => {
    if (cooldown || loading) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authApi.requestEmailVerification();
      setSuccess('Verification email sent! Please check your inbox.');
      setCooldown(true);
      // 60 second cooldown to prevent spam
      setTimeout(() => setCooldown(false), 60000);
    } catch (err: any) {
      console.error('Request verification error:', err);
      if (err.response?.status === 429) {
        setError('Too many requests. Please wait a moment before trying again.');
        setCooldown(true);
        setTimeout(() => {
          setCooldown(false);
          setError('');
        }, 60000);
      } else {
        setError(
          err.response?.data?.message ||
            'Failed to send verification email. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Don't show modal if user is verified
  if (user?.emailVerified) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose || (() => {})}>
      <div className="pt-[40px] flex flex-col items-center gap-[30px] lg:gap-[50px] font-inter">
        <div className="w-16 h-16 bg-[#1E9500]/10 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-[#1E9500]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <div className="flex flex-col gap-[10px] text-center max-w-[380px]">
          <p className="text-[32px] font-semibold text-[#1C1C1C]">
            Verify Your Email
          </p>
          <p className="text-[#1C1C1CBF] text-[18px] font-normal">
            Please verify your email address to access all features
          </p>
          {user?.email && (
            <p className="text-[16px] font-semibold text-[#1C1C1C] mt-2">
              {user.email}
            </p>
          )}
        </div>

        {error && (
          <div className="w-full max-w-[400px] p-3 bg-red-50 border border-red-200 rounded-[8px]">
            <p className="text-red-600 text-[14px] text-center">{error}</p>
          </div>
        )}

        {success && (
          <div className="w-full max-w-[400px] p-3 bg-green-50 border border-green-200 rounded-[8px]">
            <p className="text-green-600 text-[14px] text-center">{success}</p>
          </div>
        )}

        <div className="w-full max-w-[400px] flex flex-col items-center justify-center gap-3">
          <button
            onClick={handleRequestVerification}
            disabled={loading || cooldown}
            className="w-full bg-button text-white py-4 px-6 rounded-[10px] font-medium text-[16px] hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : cooldown ? 'Please wait...' : 'Send Verification Email'}
          </button>
          {onClose && (
            <button
              onClick={() => {
                if (onDismiss) {
                  onDismiss();
                }
                onClose();
              }}
              className="text-center text-[14px] font-normal text-[#1C1C1C80] hover:text-[#1C1C1C] transition-all"
            >
              I'll verify later
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default EmailVerificationModal;

