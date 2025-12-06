import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'children'
> {
  label?: string;
  required?: boolean;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  required = false,
  error,
  options,
  placeholder = 'Select an option',
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-[#1C1C1C] text-[16px] font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        {...props}
        className={`py-3 border border-fade rounded-xl w-full px-4 bg-[#FFFFFF] text-[#1C1C1C] text-[15px] focus:outline-none focus:ring-2 focus:ring-button focus:border-transparent transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:20px] bg-[right_1rem_center] bg-no-repeat ${
          error ? 'border-red-500' : ''
        } ${className}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-[14px] font-normal">{error}</p>}
    </div>
  );
};

export default Select;
