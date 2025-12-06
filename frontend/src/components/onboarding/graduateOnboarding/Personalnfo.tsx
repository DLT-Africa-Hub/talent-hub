import React, { useState, useMemo } from 'react';
import { GraduateForm } from '../../../constants/type';
import Input from '../../ui/Input';
import PhoneInput from '../../ui/PhoneInput';
import Button from '../../ui/Button';
import ResumeInput, { UploadedFile } from '../../ui/ResumeInput';

interface Props {
  form: GraduateForm;
  onChange: (patch: Partial<GraduateForm>) => void;
  onNext: () => void;
}

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
      (form.phoneNo?.trim() ?? '') &&
      (form.cv?.length ?? 0) > 0
    );
  }, [form.firstName, form.lastName, form.phoneNo, form.cv]);

  return (
    <div className="flex items-center justify-center w-full flex-col gap-6 md:gap-8 font-inter max-w-[542px] mx-auto">
      <div className="flex flex-col w-full gap-2.5 text-left md:text-center">
        <h2 className="font-semibold text-[32px] text-[#1C1C1C]">
          Set up your profile
        </h2>
        <p className="font-normal text-[18px] text-[#1C1C1CBF]">
          Tell us more about you
        </p>
      </div>

      <form
        className="flex flex-col gap-4 w-full"
        onSubmit={(e) => {
          e.preventDefault();
          if (isFormComplete) onNext();
        }}
      >
        <div className="flex items-center gap-2.5 w-full">
          <div className="flex-1">
            <Input
              label="First Name"
              required
              type="text"
              placeholder="John"
              name="firstName"
              value={form.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
            />
          </div>

          <div className="flex-1">
            <Input
              label="Last Name"
              required
              type="text"
              placeholder="Doe"
              name="lastName"
              value={form.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
            />
          </div>
        </div>

        <PhoneInput
          label="Phone Number"
          required
          value={form.phoneNo || ''}
          onChange={handlePhoneChange}
          countryCode={countryCode}
          onCountryCodeChange={setCountryCode}
        />

        <ResumeInput
          value={form.cv as UploadedFile[]}
          onChange={(files) => {
            onChange({ cv: files });
          }}
        />

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
