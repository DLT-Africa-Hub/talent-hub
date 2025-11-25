import React, { useMemo } from 'react';
import { GraduateForm } from '../../../constants/type';
import { experienceLevels } from '../../../utils/material.utils';

import Select from '../../ui/Select';

import Button from '../../ui/Button';

import { Textarea } from '../../ui';

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
const Experience: React.FC<Props>  = ({ form, onChange, onNext }) => {
    const handleInputChange = (name: string, value: string) => {
      onChange({ [name]: value });
    };
  
    const isFormComplete = useMemo(() => {
      // If you want to require a CV, add: form.cv && form.cv.length > 0
      return (
      
        (form.rank?.trim() ?? '') !== '' &&
        (form.yearsOfExperience?.trim() ?? '') !== '' &&
        (form.summary?.trim() ?? '') 
       
        // && (form.cv?.length ?? 0) > 0 // <-- uncomment to require resume
      );
    }, [
      form.rank,
      form.yearsOfExperience,
      form.summary,
    ]);
  
    return (
      <div className="flex items-center justify-center w-full flex-col gap-6 md:gap-8 font-inter max-w-[542px] mx-auto">
        {/* Header */}
        <div className="flex flex-col w-full gap-2.5 text-left md:text-center">
          <h2 className="font-semibold text-[32px] text-[#1C1C1C]">
            Set up your profile
          </h2>
          <p className="font-normal text-[18px] text-[#1C1C1CBF]">
            Let's get to know about your work experience
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

            <Textarea
                label="Summary"
                rows={5}
                required
                placeholder="I have 3 years of experience"
                name="summary"
                value={form.summary}
                onChange={(e) => handleInputChange('summary', e.target.value)}
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
}

export default Experience