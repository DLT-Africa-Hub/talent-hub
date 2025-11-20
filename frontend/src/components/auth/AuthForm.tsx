import React from 'react';
import { FcGoogle } from 'react-icons/fc';
import { Link } from 'react-router-dom';
import { Input, Button } from '../ui';

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
}) => {
  return (

    <div className="flex items-center justify-center min-h-screen w-full font-inter bg-form bg-cover bg-center">
      <div className="absolute inset-0 bg-white/50"></div>
      <div className="flex flex-col items-center justify-center gap-6 md:gap-8 z-10 py-12 px-5 w-full max-w-[542px] mx-auto">
        {/* Header */}
        <div className="flex flex-col w-full gap-2.5 text-left md:text-center">
          <h2 className="font-semibold text-[32px] text-[#1C1C1C]">{title}</h2>
          <p className="font-normal text-[18px] text-[#1C1C1CBF]">{subtitle}</p>
        </div>


        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 w-full"
        >
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
            {error && (
              <p className="text-center text-red-500 text-[14px] font-normal">
                {error}
              </p>
            )}

          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button type="submit" fullWidth disabled={isButtonDisabled}>
              {buttonText}
            </Button>

            {showGoogleButton && (
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 text-[16px] font-medium border-2 border-button py-3 rounded-[10px] text-[#1C1C1C] hover:bg-button/5 transition-all duration-200"
            >
              <FcGoogle className="text-[24px]" />
              Continue with Google
            </button>
            )}

            <Link
              to={linkPath}
              className="text-center text-[14px] font-normal text-[#1E9500] hover:underline transition-all"
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
