import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import AuthForm from '../components/auth/AuthForm';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isFormValid =
    token.trim().length > 0 &&
    password.trim().length >= 8 &&
    confirmPassword.trim().length > 0 &&
    password === confirmPassword;

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Invalid or missing reset token');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(
        err.response?.data?.message ||
          'Failed to reset password. The token may be invalid or expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full font-inter bg-form bg-cover bg-center">
        <div className="absolute inset-0 bg-white/50"></div>
        <div className="flex flex-col items-center justify-center gap-6 md:gap-8 z-10 py-12 px-5 w-full max-w-[542px] mx-auto">
          <div className="flex flex-col w-full gap-2.5 text-left md:text-center">
            <h2 className="font-semibold text-[32px] text-[#1C1C1C]">
              Password Reset Successful
            </h2>
            <p className="font-normal text-[18px] text-[#1C1C1CBF]">
              Your password has been reset successfully. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthForm
      title="Reset Password"
      subtitle="Enter your new password"
      buttonText={loading ? 'Resetting...' : 'Reset Password'}
      linkText="Back to Login"
      linkPath="/login"
      onSubmit={handleSubmit}
      fields={[
        {
          label: 'New Password',
          name: 'password',
          type: 'password',
          placeholder: 'Enter new password',
          value: password,
          onChange: (e) => {
            setPassword(e.target.value);
            if (error) setError('');
          },
        },
        {
          label: 'Confirm Password',
          name: 'confirmPassword',
          type: 'password',
          placeholder: 'Confirm new password',
          value: confirmPassword,
          onChange: (e) => {
            setConfirmPassword(e.target.value);
            if (error) setError('');
          },
        },
      ]}
      error={error}
      isButtonDisabled={!isFormValid || loading}
    />
  );
};

export default ResetPassword;

