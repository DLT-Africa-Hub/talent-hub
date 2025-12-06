import React from 'react';
import { Link } from 'react-router-dom';
import { Input, Button } from '../ui';
import { GoogleLoginButton } from './GoogleButton';

interface AuthFormProps {
  title: string;
  subtitle: string;
  fields: {
    label: string;
    name: string;
    type: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }[];
  onSubmit: (e: React.FormEvent) => void;
  buttonText: string;
  linkText: string;
  linkPath: string;
  error: string;
  forgotPasswordLink?: {
    text: string;
    path: string;
    fieldIndex?: number; // Index of the password field to add the link after
  };
  showGoogleButton?: boolean; // Option to show/hide Google button
  isButtonDisabled?: boolean; // Disable submit button
  isLoading?: boolean;
  loadingText?: string;
  onGoogleClick: () => void;
  onGoogleSuccess?: (data: { code: string }) => void;
  onGoogleError?: (error: { message?: string }) => void;

  // NEW
  mode: 'login' | 'register';
  role?: 'graduate' | 'company';
  setRole?: (role: 'graduate' | 'company') => void;
}

const AuthForm: React.FC<AuthFormProps> = ({
  title,
  subtitle,
  fields,
  onSubmit,
  buttonText,
  linkText,
  linkPath,
  error,
  forgotPasswordLink,
  showGoogleButton = true,
  isButtonDisabled = false,
  isLoading = false,
  loadingText,
  onGoogleClick,
  onGoogleSuccess,
  onGoogleError,

  mode,
  role,
  setRole,
}) => {
  return (
    <div className="flex items-center justify-center min-h-screen w-full font-inter bg-form bg-cover bg-center">
      <div className="absolute inset-0 bg-white/50"></div>

      <div className="flex flex-col items-center justify-between  lg:justify-center gap-6 z-10 py-12 px-5 w-full max-w-[542px] mx-auto">
        {/* ---------- HEADER ---------- */}
        <div className="flex flex-col w-full text-center">
          <h2 className="font-semibold text-[32px] text-[#1C1C1C]">{title}</h2>
          <p className="font-normal text-[18px] text-[#1C1C1CBF]">{subtitle}</p>
        </div>

        {/* ---------- ROLE TABS (ONLY ON REGISTER) ---------- */}
        {mode === 'register' && (
          <div className="w-full mb-2">
            <div className="flex border-b border-gray-200  rounded-t-xl">
              {/* Graduate */}
              <button
                type="button"
                onClick={() => setRole?.('graduate')}
                className={`flex-1 py-4 px-6 text-center font-semibold rounded-tl-xl ${
                  role === 'graduate'
                    ? 'text-[#249400] border-b-2 border-[#249400] bg-green-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Graduate
              </button>

              {/* Company */}
              <button
                type="button"
                onClick={() => setRole?.('company')}
                className={`flex-1 py-4 px-6 text-center font-semibold rounded-tr-xl ${
                  role === 'company'
                    ? 'text-[#249400] border-b-2 border-[#249400] bg-green-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Company
              </button>
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-4">
            {fields.map((field, index) => (
              <div key={index}>
                <Input
                  label={field.label}
                  type={field.type}
                  name={field.name}
                  placeholder={field.placeholder}
                  value={field.value}
                  onChange={field.onChange}
                  required
                  error={error ? ' ' : undefined}
                />
                {forgotPasswordLink &&
                  forgotPasswordLink.fieldIndex === index &&
                  field.type === 'password' && (
                    <div className="flex justify-end mt-2">
                      <Link
                        to={forgotPasswordLink.path}
                        className="text-[14px] font-normal text-[#1E9500] hover:underline transition-all"
                      >
                        {forgotPasswordLink.text}
                      </Link>
                    </div>
                  )}
              </div>
            ))}
          </div>

          {error && (
            <p className="text-center text-red-500 text-[14px]">{error}</p>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              fullWidth
              disabled={isButtonDisabled || isLoading}
            >
              {isLoading ? loadingText || buttonText : buttonText}
            </Button>

            {showGoogleButton && (
              <GoogleLoginButton
                login={onGoogleClick}
                onSuccess={onGoogleSuccess}
                onError={onGoogleError}
                role={role}
              />
            )}

            <Link
              to={linkPath}
              className="text-center text-[14px] text-[#1E9500] hover:underline"
            >
              {linkText}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthForm;
