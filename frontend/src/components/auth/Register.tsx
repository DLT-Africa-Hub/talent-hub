import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import AuthForm from './AuthForm';

const Register = () => {
  const [role, setRole] = useState<'graduate' | 'company'>('graduate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  const google = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse: any) => {
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_APP_API_URL}/auth/google/authcode`,
          {
            code: codeResponse.code,
            role,
          }
        );

        console.log(res.data);

        if (role === 'graduate') {
          navigate('/onboarding');
        } else {
          navigate('/company/onboarding');
        }
      } catch (err: any) {
        console.error(err);
        setError('Google login failed');
      }
    },
    onError: (err: any) => {
      console.error('Google login error', err);
      setError('Google login failed');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
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
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthForm
        mode="register"
        role={role}
        setRole={setRole}
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
              role === 'company' ? 'company@example.com' : 'john@example.com',
            value: email,
            onChange: (e: any) => setEmail(e.target.value),
          },
          {
            label: 'Password',
            name: 'password',
            type: 'password',
            placeholder: 'password',
            value: password,
            onChange: (e: any) => setPassword(e.target.value),
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
