import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}) => {
  const baseClasses =
    'rounded-[10px] text-[16px] font-medium transition-all duration-200 h-[52px] flex items-center justify-center cursor-pointer';

  const variantClasses = {
    primary: disabled
      ? 'bg-[#1c770092] text-[#F8F8F8] cursor-not-allowed opacity-60'
      : 'bg-button text-[#F8F8F8] hover:bg-[#1B7700] shadow-lg hover:shadow-xl transform hover:-translate-y-0.5',
    secondary: disabled
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
      : 'bg-gray-200 text-[#1C1C1C] hover:bg-gray-300',
    danger: disabled
      ? 'bg-red-300 text-red-500 cursor-not-allowed'
      : 'bg-red-500 text-white hover:bg-red-600',
  };

  const widthClass = fullWidth ? 'w-full' : 'w-full md:w-[400px] mx-auto';

  return (
    <button
      {...props}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${className}`.trim()}
    >
      {children}
    </button>
  );
};

export default Button;
