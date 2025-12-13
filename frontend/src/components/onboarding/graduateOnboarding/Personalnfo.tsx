import React, { useState, useMemo } from 'react';
import { GraduateForm } from '../../../constants/type';
import Input from '../../ui/Input';
import PhoneInput from '../../ui/PhoneInput';
import Button from '../../ui/Button';
import ResumeInput, { UploadedFile } from '../../ui/ResumeInput';
import { parseCV } from '../../../utils/cvParser';
import { Loader2 } from 'lucide-react';

interface Props {
  form: GraduateForm;
  onChange: (patch: Partial<GraduateForm>) => void;
  onNext: () => void;
}

const Personalnfo: React.FC<Props> = ({ form, onChange, onNext }) => {
  const [countryCode, setCountryCode] = useState('+234');
  const [isParsingCV, setIsParsingCV] = useState(false);
  const [parsingError, setParsingError] = useState<string | null>(null);

  const handleInputChange = (name: string, value: string) => {
    onChange({ [name]: value });
  };

  const handlePhoneChange = (phoneNo: string) => {
    onChange({ phoneNo });
  };

  const handleCVUploaded = async (file: File) => {
    // Only parse if form fields are empty (first upload)
    const shouldParse = !form.firstName && !form.lastName && !form.phoneNo;

    if (!shouldParse) {
      return; // Don't overwrite existing data
    }

    setIsParsingCV(true);
    setParsingError(null);

    try {
      const parsedData = await parseCV(file);

      // Auto-fill form fields with parsed data
      const updates: Partial<GraduateForm> = {};

      if (parsedData.firstName && !form.firstName) {
        updates.firstName = parsedData.firstName;
      }

      if (parsedData.lastName && !form.lastName) {
        updates.lastName = parsedData.lastName;
      }

      if (parsedData.phoneNo && !form.phoneNo) {
        updates.phoneNo = parsedData.phoneNo;
        // Try to extract country code from phone number
        if (parsedData.phoneNo.startsWith('+')) {
          const match = parsedData.phoneNo.match(/^(\+\d{1,3})/);
          if (match) {
            setCountryCode(match[1]);
          }
        }
      }

      if (parsedData.skills && parsedData.skills.length > 0) {
        updates.skills = parsedData.skills;
      }

      if (parsedData.yearsOfExperience && !form.yearsOfExperience) {
        updates.yearsOfExperience = parsedData.yearsOfExperience;
      }

      if (parsedData.summary && !form.summary) {
        updates.summary = parsedData.summary;
      }

      if (
        parsedData.roles &&
        parsedData.roles.length > 0 &&
        (!form.roles || form.roles.length === 0)
      ) {
        updates.roles = parsedData.roles;
      }

      if (parsedData.rank && !form.rank) {
        updates.rank = parsedData.rank;
      }

      if (Object.keys(updates).length > 0) {
        onChange(updates);
      }
    } catch (error) {
      console.error('Error parsing CV:', error);
      setParsingError('Failed to parse CV. Please fill in the form manually.');
    } finally {
      setIsParsingCV(false);
    }
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

        <Input
          label="Input location"
          name="location"
          value={form.location || ''}
          onChange={(e) => handleInputChange('location', e.target.value)}
          required
          placeholder="e.g., Lagos, Nigeria"
        />

        <ResumeInput
          value={form.cv as UploadedFile[]}
          onChange={(files) => {
            onChange({ cv: files });
          }}
          onFileUploaded={handleCVUploaded}
        />

        {isParsingCV && (
          <div className="flex items-center gap-2 text-sm text-[#1C1C1CBF]">
            <Loader2 size={16} className="animate-spin" />
            <span>Parsing CV and auto-filling details...</span>
          </div>
        )}

        {parsingError && (
          <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
            {parsingError}
          </div>
        )}

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
