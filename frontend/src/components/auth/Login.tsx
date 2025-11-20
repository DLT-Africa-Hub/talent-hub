import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { AuthResponsePayload } from '../../types/auth';
import { graduateApi } from '../../api/graduate';
import { companyApi } from '../../api/company';
import AuthForm from './AuthForm';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [role, setRole] = useState<'graduate' | 'company'>('graduate');
  const { login, ingestAuthPayload } = useAuth();
  const navigate = useNavigate();

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  const handlePostLoginNavigation = async (userRole?: string) => {
    if (userRole === 'graduate') {
      try {
        const profileResponse = await graduateApi.getProfile();
        const graduate = profileResponse.graduate;

        if (graduate) {
          const assessmentData = graduate.assessmentData;
          const hasCompletedAssessment = assessmentData?.submittedAt != null;

          if (!hasCompletedAssessment) {
            navigate('/assessment', { replace: true });
            return;
          }

          navigate('/graduate', { replace: true });
          return;
        }
      } catch (profileError: any) {
        if (profileError.response?.status === 404) {
          navigate('/onboarding', { replace: true });
          return;
        }

        if (profileError.response?.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }

        console.error('Profile check error:', profileError);
        navigate('/onboarding', { replace: true });
        return;
      }
    }

    if (userRole === 'company') {
      try {
        await companyApi.getProfile();
        navigate('/company', { replace: true });
        return;
      } catch (profileError: any) {
        if (profileError.response?.status === 404) {
          navigate('/company/onboarding', { replace: true });
          return;
        }

        if (profileError.response?.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }

        console.error('Company profile check error:', profileError);
        navigate('/company/onboarding', { replace: true });
        return;
      }
    }

    if (userRole === 'admin') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/graduate', { replace: true });
    }
  };

  const handlePasswordLogin = async () => {
    const authPayload = await login(email, password);
    await handlePostLoginNavigation(authPayload.user.role);
  };

  const handleExternalAuthSuccess = async (payload: AuthResponsePayload) => {
    ingestAuthPayload(payload);
    await handlePostLoginNavigation(payload.user.role);
  };

  const handleGoogleError = (googleError: unknown) => {
    console.error('Google login error:', googleError);
    setError('Google login failed. Please try again.');
  };

  const googleSubmit = useGoogleLogin({
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
        await handleExternalAuthSuccess(res.data);
      } catch (error) {
        handleGoogleError(error);
        console.error('Google auth error:', error);
      }
    },
    onError: handleGoogleError,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await handlePasswordLogin();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <>
      <AuthForm
        mode="login"
        role={role}
        setRole={setRole}
        title="Login"
        subtitle={`Welcome Back ${role === 'graduate' ? 'Graduate' : 'Company'}`}
        buttonText="Continue"
        linkText="Don't have an account? Please register here"
        linkPath="/register"
        onSubmit={handleSubmit}
        onGoogleClick={googleSubmit}
        fields={[
          {
            label: 'Email',
            name: 'email',
            type: 'email',
            placeholder:
              role === 'company' ? 'company@example.com' : 'john@example.com',
            value: email,
            onChange: (e) => {
              setEmail(e.target.value);
              if (error) setError('');
            },
          },
          {
            label: 'Password',
            name: 'password',
            type: 'password',
            placeholder: 'password',
            value: password,
            onChange: (e) => {
              setPassword(e.target.value);
              if (error) setError('');
            },
          },
        ]}
        error={error}
        forgotPasswordLink={{
          text: 'Forgot Password?',
          path: '/forgot-password',
          fieldIndex: 1,
        }}
        isButtonDisabled={!isFormValid}
      />
    </>
  );
};

export default Login;