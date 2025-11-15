import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { graduateApi } from '../../api/graduate';
import { companyApi } from '../../api/company';
import AuthForm from './AuthForm';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);

      // Wait a tick to ensure AuthContext state is updated
      await new Promise((resolve) => setTimeout(resolve, 100));

      const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');

      if (loggedInUser.role === 'graduate') {
        try {
          // Check if profile exists
          const profileResponse = await graduateApi.getProfile();
          const graduate = profileResponse.graduate;
          
          // Profile exists - check assessment status
          if (graduate) {
            const assessmentData = graduate.assessmentData;
            const hasCompletedAssessment = assessmentData?.submittedAt != null;

            if (!hasCompletedAssessment) {
              // Profile exists but assessment not done - go to assessment
              navigate('/assessment', { replace: true });
              return;
            }

            // Profile exists and assessment done - go to dashboard
            navigate('/graduate', { replace: true });
            return;
          }
        } catch (profileError: any) {
          // If profile doesn't exist (404), they need onboarding first
          if (profileError.response?.status === 404) {
            navigate('/onboarding', { replace: true });
            return;
          }

          // If 401, token might be invalid - redirect to login
          if (profileError.response?.status === 401) {
            setError('Session expired. Please log in again.');
            return;
          }

          // For other errors, try onboarding (might be a new user)
          console.error('Profile check error:', profileError);
          navigate('/onboarding', { replace: true });
          return;
        }
      }

      if (loggedInUser.role === 'company') {
        try {
          // Check if company profile exists
          await companyApi.getProfile();
          
          // Profile exists - go to dashboard
        navigate('/company', { replace: true });
          return;
        } catch (profileError: any) {
          // If profile doesn't exist (404), they need onboarding first
          if (profileError.response?.status === 404) {
            navigate('/company/onboarding', { replace: true });
            return;
          }

          // If 401, token might be invalid - redirect to login
          if (profileError.response?.status === 401) {
            setError('Session expired. Please log in again.');
            return;
          }

          // For other errors, try onboarding (might be a new user)
          console.error('Company profile check error:', profileError);
          navigate('/company/onboarding', { replace: true });
          return;
        }
      }

      // Default redirect based on role
      if (loggedInUser.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/graduate', { replace: true });
      }
    } catch (err: any) {

      console.error('Login error:', err);

      setError(
        err.response?.data?.message || 'Login failed. Please try again.'
      );
    }
  };

  return (
    <AuthForm
      title="Login"
      subtitle="Welcome Back"
      buttonText="Continue"
      linkText="Don't have an account? Please register here"
      linkPath="/register"
      onSubmit={handleSubmit}
      fields={[
        {
          label: 'Email',
          name: 'email',
          type: 'email',
          placeholder: 'John@example.com',
          value: email,
          onChange: (e) => setEmail(e.target.value),
        },
        {
          label: 'Password',
          name: 'password',
          type: 'password',
          placeholder: 'password',
          value: password,
          onChange: (e) => setPassword(e.target.value),
        },
      ]}
      error={error}
    />
  );
};

export default Login;
