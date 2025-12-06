import React, { useState } from 'react';
import { HiEye, HiEyeSlash } from 'react-icons/hi2';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  required = false,
  error,
  className = '',
  type,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-[#1C1C1C] text-[16px] font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          {...props}
          type={isPassword && showPassword ? 'text' : type}
          className={`py-3 border rounded-xl w-full ${
            isPassword ? 'pr-12' : 'px-4'
          } pl-4 bg-[#FFFFFF] placeholder:text-[#1C1C1C33] text-[15px] focus:outline-none transition-all ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-fade focus:ring-2 focus:ring-button focus:border-transparent'
          } ${className}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1C1C1C80] hover:text-[#1C1C1C] transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <HiEyeSlash className="w-5 h-5" />
            ) : (
              <HiEye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-[14px] font-normal">{error}</p>}
    </div>
  );
};

export default Input;
