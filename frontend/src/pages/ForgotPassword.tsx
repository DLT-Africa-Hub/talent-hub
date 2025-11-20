import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import AuthForm from '../components/auth/AuthForm';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isFormValid = email.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await authApi.requestPasswordReset(email);
      setSuccess(true);
    } catch (err: any) {
      console.error('Password reset request error:', err);
      setError(
        err.response?.data?.message ||
          'Failed to send reset email. Please try again.'
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
              Check Your Email
            </h2>
            <p className="font-normal text-[18px] text-[#1C1C1CBF]">
              If an account exists for {email}, we've sent a password reset link
              to your email address.
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full px-4 py-3 rounded-[10px] bg-[#1E9500] text-white font-medium hover:bg-[#1a7d00] transition-all duration-200"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthForm
      title="Forgot Password"
      subtitle="Enter your email to receive a password reset link"
      buttonText={loading ? 'Sending...' : 'Send Reset Link'}
      linkText="Remember your password? Login here"
      linkPath="/login"
      onSubmit={handleSubmit}
      fields={[
        {
          label: 'Email',
          name: 'email',
          type: 'email',
          placeholder: 'John@example.com',
          value: email,
          onChange: (e) => {
            setEmail(e.target.value);
            if (error) setError('');
          },
        },
      ]}
      error={error}
      showGoogleButton={false}
      isButtonDisabled={!isFormValid || loading}
    />
  );
};

export default ForgotPassword;

