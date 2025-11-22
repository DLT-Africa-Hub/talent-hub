import React from 'react';

interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  hint,
  children,
  className = '',
  htmlFor,
}) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-[14px] font-medium text-[#1C1C1C]"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-[12px] text-[#1C1C1C80]">{hint}</p>
      )}
      {error && (
        <p className="text-[12px] text-red-600">{error}</p>
      )}
    </div>
  );
};

export default FormField;

