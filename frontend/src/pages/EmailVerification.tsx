import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { Button } from '../components/ui';
import { ApiError } from '../types/api';

const EmailVerification = () => {
  const { user, isAuthenticated, updateUser, ingestAuthPayload } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // Check if token is in URL (from email link)
  const token = searchParams.get('token');

  const getDestinationForRole = (role?: string | null) => {
    switch (role) {
      case 'graduate':
        return '/graduate';
      case 'company':
        return '/company';
      case 'admin':
        return '/admin';
      default:
        return '/';
    }
  };

  const handleVerifyEmail = useCallback(
    async (verificationToken: string) => {
      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const response = await authApi.verifyEmail(verificationToken);
        const responseRole = response?.user?.role || user?.role || null;

        // Auto-login the user after email verification
        // The backend now returns auth tokens, so we can automatically authenticate
        if (response.accessToken && response.refreshToken) {
          ingestAuthPayload(response);
          setSuccess(
            'Email verified successfully! Redirecting to your dashboard...'
          );
          const destination = getDestinationForRole(responseRole);
          setTimeout(() => {
            navigate(destination);
          }, 1500);
        } else {
          // Fallback: if tokens aren't returned, update user and prompt login
          if (user) {
            const updatedUser = { ...user, emailVerified: true };
            updateUser(updatedUser);
          }
          setSuccess('Email verified successfully! Redirecting to login...');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } catch (err) {
        console.error('Email verification error:', err);
        const error = err as ApiError;
        setError(
          error.response?.data?.message ||
            'Failed to verify email. The link may be invalid or expired.'
        );
      } finally {
        setLoading(false);
      }
    },
    [navigate, ingestAuthPayload, user, updateUser]
  );

  useEffect(() => {
    // If already verified, redirect to dashboard when logged in
    if (user?.emailVerified && isAuthenticated) {
      navigate(getDestinationForRole(user.role));
      return;
    }

    // Allow direct verification via token, even if not authenticated
    if (token) {
      handleVerifyEmail(token);
      return;
    }

    // No token and not authenticated -> go to login
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [token, isAuthenticated, user, navigate, handleVerifyEmail]);

  const handleResendVerification = async () => {
    setResendLoading(true);
    setError('');
    setSuccess('');

    try {
      await authApi.requestEmailVerification();
      setSuccess('Verification email sent! Please check your inbox.');
    } catch (err) {
      console.error('Resend verification error:', err);
      const error = err as ApiError;
      setError(
        error.response?.data?.message ||
          'Failed to send verification email. Please try again.'
      );
    } finally {
      setResendLoading(false);
    }
  };

  const canResend = Boolean(isAuthenticated && user);
  return (
    <div className="flex items-center justify-center min-h-screen w-full font-inter bg-form bg-cover bg-center">
      <div className="absolute inset-0 bg-white/50"></div>
      <div className="flex flex-col items-center justify-center gap-6 md:gap-8 z-10 py-12 px-5 w-full max-w-[542px] mx-auto">
        <div className="flex flex-col w-full gap-2.5 text-left md:text-center">
          <h2 className="font-semibold text-[32px] text-[#1C1C1C]">
            Verify Your Email
          </h2>
          <p className="font-normal text-[18px] text-[#1C1C1CBF]">
            Please verify your email address to continue
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full bg-white rounded-[12px] p-6 border border-fade">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-[#1E9500]/10 rounded-full flex items-center justify-center mb-4">
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
            <p className="text-[16px] text-[#1C1C1C] mb-2">
              We've sent a verification email to:
            </p>
            {user?.email && (
              <p className="text-[16px] font-semibold text-[#1C1C1C] mb-4">
                {user.email}
              </p>
            )}
            <p className="text-[14px] text-[#1C1C1C80] mb-6">
              Click the link in the email to verify your account. If you don't
              see the email, check your spam folder.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-[8px]">
              <p className="text-red-600 text-[14px] text-center">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-[8px]">
              <p className="text-green-600 text-[14px] text-center">
                {success}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {canResend && (
              <Button
                onClick={handleResendVerification}
                fullWidth
                disabled={resendLoading || loading}
              >
                {resendLoading ? 'Sending...' : 'Resend Verification Email'}
              </Button>
            )}

            {!canResend && (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => navigate('/login')}
                disabled={loading}
              >
                Go to Login
              </Button>
            )}

            {canResend && (
              <button
                onClick={() => navigate('/login')}
                className="text-center text-[14px] font-normal text-[#1E9500] hover:underline transition-all"
              >
                Back to Login
              </button>
            )}
          </div>

          {loading && (
            <div className="text-center">
              <p className="text-[14px] text-[#1C1C1C80]">
                Verifying your email...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
