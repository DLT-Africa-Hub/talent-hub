import React from 'react'
import Login from '../components/auth/Login';
import Register from '../components/auth/Register';


interface AuthPageProps {
    mode: string,
}

const AuthPage:React.FC<AuthPageProps> = ({mode = "login"}) => {
    const isLogin = mode === "login";
  
    return (
        <div className=''>
          {isLogin ? <Login /> : <Register />}
        </div>
      );
}

export default AuthPage