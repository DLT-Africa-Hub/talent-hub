import React from 'react';
import { FcGoogle } from 'react-icons/fc';

type Props = {
  login: () => void;
  onSuccess?: (data: { code: string }) => void;
  onError?: (error: { message?: string }) => void;
  role?: 'graduate' | 'company' | 'admin';
};

export const GoogleLoginButton: React.FC<Props> = ({ login }) => {
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
