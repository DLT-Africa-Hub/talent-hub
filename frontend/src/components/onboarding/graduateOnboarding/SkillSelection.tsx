import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduateForm } from '../../../constants/type';
import {
  getSkillsForPositions,
  rolesToPosition,
} from '../../../utils/material.utils';
import { graduateApi } from '../../../api/graduate';
import Modal from '../../auth/Modal';
import { Input, Button } from '../../ui';

interface Props {
  form: GraduateForm;
  onChange: (patch: Partial<GraduateForm>) => void;
  onBack: () => void;
}

const SkillSelection: React.FC<Props> = ({ onChange, form }) => {
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    form.skills || []
  );

  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const navigate = useNavigate();
  const filled = selectedSkills.length > 0;

  // Convert years of experience string to number
  const parseYearsOfExperience = (yearsStr: string): number => {
    if (!yearsStr) return 0;
    // Handle formats like "0-1 year", "1-3 years", "3-5 years", "5+ years"
    if (yearsStr.includes('0&minus;1') || yearsStr.includes('0-1')) return 0.5;
    if (yearsStr.includes('1&minus;3') || yearsStr.includes('1-3')) return 2;
    if (yearsStr.includes('3&minus;5') || yearsStr.includes('3-5')) return 4;
    if (yearsStr.includes('5+')) return 6;
    // Try to parse as number
    const num = parseFloat(yearsStr);
    return isNaN(num) ? 0 : num;
  };

  const handleCreateProfile = async () => {
    setIsCreatingProfile(true);
    setProfileError('');

    try {
      // Transform form data to backend format
      const position = rolesToPosition(form.roles || []) || 'other';
      const expYears = parseYearsOfExperience(form.yearsOfExperience || '0');
      // Backend will parse the phone number string (it accepts both string and number)
      const phoneNumber = form.phoneNo || '';

      const profileData = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phoneNumber: phoneNumber, // Backend will parse this (accepts string or number)
        expLevel: form.rank || 'entry',
        expYears: expYears,
        position: position,
        skills: selectedSkills,
        interests: form.interests || [],
        socials: form.socials || {},
        portfolio: form.portfolio?.trim() || undefined,
      };

      await graduateApi.createProfile(profileData);
      // Profile created successfully, navigate to assessment
      navigate('/assessment');
    } catch (err: any) {
      console.error('Profile creation error:', err);
      setProfileError(
        err.response?.data?.message ||
          'Failed to create profile. Please try again.'
      );
    } finally {
      setIsCreatingProfile(false);
    }
  };

  // Filter skills based on selected positions (roles)
  const availableSkills = useMemo(() => {
    return getSkillsForPositions(form.roles || []);
  }, [form.roles]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'github' || name === 'linkedin' || name === 'twitter') {
      onChange({
        socials: {
          ...form.socials,
          [name]: value,
        },
      });
    } else if (name === 'portfolio') {
      onChange({ portfolio: value });
    } else {
      onChange({ [name]: value });
    }
  };

  const handleSelectSkill = (skill: string) => {
    let updatedSkills: string[];

    if (selectedSkills.includes(skill)) {
      updatedSkills = selectedSkills.filter((r) => r !== skill);
    } else {
      updatedSkills = [...selectedSkills, skill];
    }

    setSelectedSkills(updatedSkills);
    onChange({ skills: updatedSkills });
  };

  return (
    <div className="flex items-center justify-center w-full flex-col gap-6 md:gap-8 font-inter max-w-[542px] mx-auto">
      <div className="flex flex-col w-full gap-2 text-left md:text-center">
        <h2 className="font-semibold text-[32px] text-[#1C1C1C]">
          Your Skills and Links
        </h2>
        <p className="font-normal text-[18px] text-[#1C1C1CBF]">
          Tell us more about you
        </p>
      </div>

      <form
        className="flex flex-col gap-4 w-full"
        onSubmit={(e) => {
          e.preventDefault();
          if (filled) {
            setIsConsentModalOpen(true);
          }
        }}
      >
        <div className="flex flex-col gap-2">
          <label className="text-[#1C1C1C] text-[16px] font-medium">
            Skills <span className="text-red-500">*</span>
          </label>
          {form.roles && form.roles.length > 0 && (
            <p className="text-[#1C1C1CBF] text-[14px] font-normal">
              Skills relevant to your selected{' '}
              {form.roles.length === 1 ? 'role' : 'roles'}
            </p>
          )}
          <div className="flex gap-2.5 justify-start items-center w-full flex-wrap">
            {availableSkills.map((skill) => {
              const isSelected = selectedSkills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => handleSelectSkill(skill)}
                  className={`flex items-center border rounded-xl py-2 px-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-button bg-button/10 text-[#1C1C1C] font-medium'
                      : 'border-fade bg-white text-[#1C1C1CBF] hover:border-button/50'
                  }`}
                >
                  <span className="text-[15px]">{skill}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Links Section */}
        <div className="flex flex-col gap-2">
          <Input
            label="Portfolio URL"
            type="url"
            placeholder="https://yourportfolio.com"
            name="portfolio"
            value={form.portfolio || ''}
            onChange={handleInputChange}
          />

          <Input
            label="GitHub"
            type="url"
            placeholder="https://github.com/you"
            name="github"
            value={form.socials?.github || ''}
            onChange={handleInputChange}
          />

          <Input
            label="LinkedIn"
            type="url"
            placeholder="https://linkedin.com/you"
            name="linkedin"
            value={form.socials?.linkedin || ''}
            onChange={handleInputChange}
          />
        </div>

        {/* Continue Button */}
        <div className="pt-2">
          <Button type="submit" disabled={!filled}>
            Continue
          </Button>
        </div>
      </form>

      {/* Consent Modal */}
      <Modal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
      >
        <div className="pt-[40px] flex flex-col items-center gap-[30px] lg:gap-[50px] font-inter">
          <img
            src="/proceed.png"
            alt="proceed"
            className="w-[156px] h-[156px]"
          />

          <div className="flex flex-col gap-[10px] text-center max-w-[380px]">
            <p className="text-[32px] font-semibold text-[#1C1C1C]">
              Before you Proceed
            </p>
            <p className="text-[#1C1C1CBF] text-[18px] font-normal">
              Do you consent to we using your data to better serve you?
            </p>
          </div>

          {profileError && (
            <p className="text-center text-red-500 text-[14px] font-normal">
              {profileError}
            </p>
          )}
          <div className="w-full max-w-[400px] flex items-center justify-center gap-3">
            <button
              onClick={handleCreateProfile}
              disabled={isCreatingProfile}
              className="w-full bg-button text-white py-4 px-6 rounded-[10px] font-medium text-[16px] hover:bg-[#1B7700] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCreatingProfile ? 'Creating profile...' : 'Yes, proceed'}
            </button>
            <button
              onClick={handleCreateProfile}
              disabled={isCreatingProfile}
              className="w-full py-4 px-6 rounded-[10px] border-2 border-[#FF383C] text-[#FF383C] font-medium text-[16px] hover:bg-red-50 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCreatingProfile ? 'Creating profile...' : 'No, cancel'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SkillSelection;
