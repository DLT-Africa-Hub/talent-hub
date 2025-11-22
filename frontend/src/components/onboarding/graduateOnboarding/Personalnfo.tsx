import React, { useState, useMemo } from 'react';
import { GraduateForm } from '../../../constants/type';
import { experienceLevels } from '../../../utils/material.utils';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import PhoneInput from '../../ui/PhoneInput';
import Button from '../../ui/Button';

interface Props {
  form: GraduateForm;
  onChange: (patch: Partial<GraduateForm>) => void;
  onNext: () => void;
}

const experienceYears = [
  { value: '3&minus;5 years', label: '3–5 years' },
  { value: '5&minus;7 years', label: '5–7 years' },
  { value: '7&minus;10 years', label: '7–10 years' },
  { value: '10+ years', label: '10+ years' },
];

const Personalnfo: React.FC<Props> = ({ form, onChange, onNext }) => {
  const [countryCode, setCountryCode] = useState('+234');

  const handleInputChange = (name: string, value: string) => {
    onChange({ [name]: value });
  };

  const handlePhoneChange = (phoneNo: string) => {
    onChange({ phoneNo });
  };

  const isFormComplete = useMemo(() => {
    return (
      form.firstName.trim() !== '' &&
      form.lastName.trim() !== '' &&
      (form.rank?.trim() ?? '') !== '' &&
      (form.yearsOfExperience?.trim() ?? '') !== '' &&
      (form.phoneNo?.trim() ?? '') !== ''
    );
  }, [
    form.firstName,
    form.lastName,
    form.rank,
    form.yearsOfExperience,
    form.phoneNo,
  ]);

  return (
    <div className="flex items-center justify-center w-full flex-col gap-6 md:gap-8 font-inter max-w-[542px] mx-auto">
      {/* Header */}
      <div className="flex flex-col w-full gap-2.5 text-left md:text-center">
        <h2 className="font-semibold text-[32px] text-[#1C1C1C]">
          Set up your profile
        </h2>
        <p className="font-normal text-[18px] text-[#1C1C1CBF]">
          Tell us more about you
        </p>
      </div>

      {/* Form */}
      <form
        className="flex flex-col gap-4 w-full"
        onSubmit={(e) => {
          e.preventDefault();
          if (isFormComplete) onNext();
        }}
      >
        <Input
          label="First Name"
          required
          type="text"
          placeholder="John"
          name="firstName"
          value={form.firstName}
          onChange={(e) => handleInputChange('firstName', e.target.value)}
        />

        <Input
          label="Last Name"
          required
          type="text"
          placeholder="Doe"
          name="lastName"
          value={form.lastName}
          onChange={(e) => handleInputChange('lastName', e.target.value)}
        />

        <PhoneInput
          label="Phone Number"
          required
          value={form.phoneNo || ''}
          onChange={handlePhoneChange}
          countryCode={countryCode}
          onCountryCodeChange={setCountryCode}
        />

        <Select
          label="Experience Level"
          required
          name="rank"
          value={form.rank || ''}
          onChange={(e) => handleInputChange('rank', e.target.value)}
          options={experienceLevels.map((lvl) => ({
            value: lvl.value,
            label: lvl.label,
          }))}
          placeholder="Select level"
        />

        <Select
          label="Years of Experience"
          required
          name="yearsOfExperience"
          value={form.yearsOfExperience || ''}
          onChange={(e) =>
            handleInputChange('yearsOfExperience', e.target.value)
          }
          options={experienceYears}
          placeholder="Select range"
        />

        {/* Continue Button */}
        <div className="pt-2">
          <Button type="submit" disabled={!isFormComplete}>
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Personalnfo;
