import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from './AuthForm';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    sessionStorage.setItem('registerEmail', email);
    sessionStorage.setItem('registerPassword', password);
    navigate('/role');
  };

  return (
    <>
      <AuthForm
        title="Create Account"
        subtitle="Join our talent marketplace"
        buttonText="Continue"
        linkText="Already have an account? Login"
        linkPath="/login"
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
        isButtonDisabled={!isFormValid}
      />
    </>
  );
};

export default Register;
