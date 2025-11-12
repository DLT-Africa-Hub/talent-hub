import React from 'react';
import { FcGoogle } from 'react-icons/fc';
import { Link } from 'react-router-dom';

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
  error:string;
}

const AuthForm: React.FC<AuthFormProps> = ({
  title,
  subtitle,
  fields,
  onSubmit,
  buttonText,
  linkText,
  linkPath,
  error
}) => {
  return (
    <div className="flex items-center justify-center h-screen w-full font-inter bg-form bg-cover bg-center ">
        <div className="absolute inset-0 bg-white/50"></div>
      <div className="flex flex-col items-center justify-center gap-[20px] z-10  lg:pt-[124px] py-[45px] w-full h-full max-w-[1058px] lg:h-auto px-[15px] lg:px-[150px] rounded-[20px]">
        <form onSubmit={onSubmit} className="flex flex-col gap-[24px] justify-between h-full w-full max-w-[400px]">
          <div className="w-full flex flex-col text-left md:text-center">
            <p className="font-semibold text-[32px] text-[#1C1C1C]">{title}</p>
            <p className="font-normal text-[18px] text-[#1C1C1CBF]">{subtitle}</p>
          </div>

          <div className="flex flex-col gap-[20px]">
            {fields.map((field, index) => (
              <div key={index} className="w-full flex flex-col gap-[10px] max-w-[542px]">
                <label className="text-[#1C1C1CBF] text-[18px] font-normal">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  placeholder={field.placeholder}
                  value={field.value}
                  onChange={field.onChange}
                  className="h-[62px] border border-[#C8D7EF] rounded-xl w-full px-5 bg-[#FFFFFF] placeholder:text-[#1C1C1C33]"
                />
              </div>
            ))}
            <p className='text-center text-red-500'>{error}</p>
          </div>

          <div className="flex flex-col gap-[10px]">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-[12px] text-[16px] bg-button py-[15px] rounded-[10px] text-[#F8F8F8] cursor-pointer"
            >
              {buttonText}
            </button>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-[12px] text-[16px] border-2 border-button py-[15px] rounded-[10px] text-[#1C1C1C] cursor-pointer"
            >
              <FcGoogle className="text-[24px]" />
              Continue with Google
            </button>

            <Link
              to={linkPath}
              className="text-center text-[14px] font-normal underline text-[#1E9500] cursor-pointer"
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
