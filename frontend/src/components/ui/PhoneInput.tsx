import React from 'react';
import { countryCodes } from '../../utils/material.utils';

interface PhoneInputProps {
  label?: string;
  required?: boolean;
  error?: string;
  value: string;
  onChange: (phoneNo: string) => void;
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  placeholder?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  label,
  required = false,
  error,
  value,
  onChange,
  countryCode,
  onCountryCodeChange,
  placeholder = '816 921 1501',
}) => {
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const localPhone = e.target.value;
    const combined = `${countryCode}${localPhone.replace(/\s+/g, '')}`;
    onChange(combined);
  };

  // Extract local phone number from full phone number
  const localPhone =
    value && value.startsWith(countryCode)
      ? value.replace(countryCode, '')
      : value || '';

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-[#1C1C1C] text-[16px] font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div
        className={`flex items-center border border-fade rounded-xl bg-[#FFFFFF] focus-within:ring-2 focus-within:ring-button focus-within:border-transparent transition-all ${
          error ? 'border-red-500' : ''
        }`}
      >
        <select
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value)}
          className="py-3 px-3 border-r border-fade bg-transparent text-[15px] focus:outline-none cursor-pointer"
        >
          {countryCodes.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code}
            </option>
          ))}
        </select>
        <input
          type="tel"
          placeholder={placeholder}
          value={localPhone}
          onChange={handlePhoneChange}
          className="py-3 w-full px-4 bg-transparent placeholder:text-[#1C1C1C33] text-[15px] focus:outline-none"
        />
      </div>
      {error && <p className="text-red-500 text-[14px] font-normal">{error}</p>}
    </div>
  );
};

export default PhoneInput;
