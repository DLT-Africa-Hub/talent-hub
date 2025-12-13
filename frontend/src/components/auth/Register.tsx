import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import axios, { AxiosError } from 'axios';
import { useAuth } from '../../context/AuthContext';
import AuthForm from './AuthForm';

interface ErrorResponse {
  message?: string;
  reason?: string;
}

// Common public email domains that should be rejected for company registration
const PUBLIC_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'aol.com',
  'icloud.com',
  'protonmail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'mail.com',
  'fastmail.com',
];

const isPublicEmailDomain = (email: string): boolean => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return PUBLIC_EMAIL_DOMAINS.includes(domain);
};

const validateCompanyEmail = (email: string): string | null => {
  if (!email.trim()) return null; // Let required validation handle empty

  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    return 'Invalid email format';
  }

  if (isPublicEmailDomain(email)) {
    return 'Please use a company email address. Personal email providers (Gmail, Yahoo, etc.) are not allowed for company registration.';
  }

  return null;
};

const Register = () => {
  const [role, setRole] = useState<'graduate' | 'company'>('graduate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, ingestAuthPayload } = useAuth();
  const navigate = useNavigate();

  const isFormValid =
    email.trim().length > 0 && password.trim().length > 0 && !emailError;

  const formatErrorMessage = (
    error: AxiosError<ErrorResponse> | Error
  ): string => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || 'An error occurred';
      const reason = error.response?.data?.reason;

      if (reason) {
        return `${message} ${reason ? `(${reason})` : ''}`;
      }
      return message;
    }
    return error.message || 'An unexpected error occurred';
  };

  const google = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse: { code: string }) => {
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_APP_API_URL}/auth/google/authcode`,
          {
            code: codeResponse.code,
            role,
          }
        );

        ingestAuthPayload(res.data);

        if (role === 'graduate') {
          navigate('/onboarding');
        } else {
          navigate('/company/onboarding');
        }
      } catch (err: unknown) {
        const error = err as {
          message?: string;
          response?: { data?: { message?: string } };
        };
        console.error(error);
        setError(formatErrorMessage(err as AxiosError<ErrorResponse>));
      }
    },
    onError: (err: { message?: string }) => {
      console.error('Google login error', err);
      setError('Google login failed');
    },
  });

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setError(''); // Clear previous errors

    // Validate company email in real-time
    if (role === 'company') {
      const validationError = validateCompanyEmail(newEmail);
      setEmailError(validationError);
    } else {
      setEmailError(null);
    }
  };

  const handleRoleChange = (newRole: 'graduate' | 'company') => {
    setRole(newRole);
    setError('');
    setEmailError(null);
    // Re-validate email if switching to company role
    if (newRole === 'company' && email) {
      const validationError = validateCompanyEmail(email);
      setEmailError(validationError);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    // Final validation for company emails
    if (role === 'company') {
      const validationError = validateCompanyEmail(email);
      if (validationError) {
        setError(validationError);
        setEmailError(validationError);
        return;
      }
    }

    setError('');
    setEmailError(null);
    setIsSubmitting(true);
    try {
      const backendRole = role === 'graduate' ? 'graduate' : 'company';

      await register(email, password, backendRole);

      if (backendRole === 'graduate') {
        navigate('/onboarding');
      } else {
        navigate('/company/onboarding');
      }

      setEmail('');
      setPassword('');
    } catch (err: unknown) {
      const formattedError = formatErrorMessage(
        err as AxiosError<ErrorResponse>
      );
      setError(formattedError);

      // If it's a company email validation error from backend, also set emailError
      if (role === 'company' && axios.isAxiosError(err)) {
        const errorData = err.response?.data as ErrorResponse | undefined;
        if (errorData?.message?.toLowerCase().includes('company email')) {
          setEmailError(errorData.message);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthForm
        mode="register"
        role={role}
        setRole={handleRoleChange}
        title={`Create ${role === 'graduate' ? 'Graduate' : 'Company'} Account`}
        subtitle={
          role === 'graduate'
            ? 'Join our talent marketplace as a graduate'
            : 'Register your company to hire top talents'
        }
        buttonText="Continue"
        linkText="Already have an account? Login"
        linkPath="/login"
        onGoogleClick={google}
        onSubmit={handleSubmit}
        fields={[
          {
            label: 'Email',
            name: 'email',
            type: 'email',
            placeholder:
              role === 'company'
                ? 'company@yourcompany.com'
                : 'john@example.com',
            value: email,
            onChange: handleEmailChange,
            error: emailError || undefined,
            helpText:
              role === 'company'
                ? 'Use your company email address (not Gmail, Yahoo, etc.)'
                : undefined,
          },
          {
            label: 'Password',
            name: 'password',
            type: 'password',
            placeholder: '8 characters or more',
            value: password,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value),
          },
        ]}
        error={error}
        isButtonDisabled={!isFormValid || isSubmitting}
        isLoading={isSubmitting}
        loadingText="Registering..."
      />
    </>
  );
};

export default Register;
