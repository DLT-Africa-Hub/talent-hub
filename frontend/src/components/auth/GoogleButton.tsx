// src/components/GoogleLoginButton.tsx
import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { FcGoogle } from 'react-icons/fc';

type Props = {
  onSuccess: (data: any) => void;
  onError?: (error: any) => void;
};

export const GoogleLoginButton: React.FC<Props> = ({ onSuccess, onError }) => {
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // tokenResponse has access_token. We need id_token
        // Use Google API to get id_token
        const res = await axios.get(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          }
        );

        const userInfo = res.data; // contains email, name, picture
        // Backend expects { idToken } from Google Identity
        const backendRes = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/v1/auth/google`,
          {
            idToken: tokenResponse.credential || tokenResponse.access_token, // if id_token available
            role: 'graduate', // optional
          }
        );

        onSuccess(backendRes.data);
      } catch (error: any) {
        console.error('Google login error', error);
        if (onError) onError(error);
      }
    },
    onError: (error) => {
      console.error('Google login failed', error);
      if (onError) onError?.(error);
    },
  });

  return (
    <button
      onClick={() => login()}
      type="button"
      className="w-full flex items-center justify-center gap-3 text-[16px] font-medium border-2 border-button py-3 rounded-[10px] text-[#1C1C1C] hover:bg-button/5 transition-all duration-200"
    >
      <FcGoogle className="text-[24px]" />
      Continue with Google
    </button>
  );
};
