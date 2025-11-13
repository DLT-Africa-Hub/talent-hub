import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from './AuthForm';
import Modal from './Modal';

const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      navigate('/role');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  const handleContinue = () => {
    setIsModalOpen(false);
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
        { label: 'First Name', name: 'firstName', type: 'text', placeholder: 'John', value: firstName, onChange: e => setFirstName(e.target.value) },
        { label: 'Email', name: 'email', type: 'email', placeholder: 'John@example.com', value: email, onChange: e => setEmail(e.target.value) },
        { label: 'Password', name: 'password', type: 'password', placeholder: 'password', value: password, onChange: e => setPassword(e.target.value) },
      ]}
      error={error}
    />

     {/* Modal Component */}
     <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
       <div className='pt-[40px] flex flex-col items-center gap-[30px] lg:gap-[50px] font-inter'>
        <img src="/proceed.png" alt="proceed" className='w-[156px] h-[156px]' />

        <div className='flex flex-col gap-[10px] text-center max-w-[380px]'>
          <p className='text-[32px] font-semibold text-[#1C1C1C]'>Before you Proceed</p>
          <p className='text-[#1C1C1CBF] text-[18px] font-normal'>Do you consent to we using your data to better serve you?</p>
        </div>

        <div className='w-full max-w-[400px] flex items-center justify-center gap-[10px] '>
          <button className='w-full bg-button text-white p-[18px] rounded-[10px]'>Yes, proceed</button>
          <button className='w-full p-[18px] rounded-[10px] border-2 border-[#FF383C] text-[#FF383C]'> No, cancel</button>

        </div>

       </div>
        
      </Modal>
   </>
  );
};

export default Register;
