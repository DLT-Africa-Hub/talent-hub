import React, { useState, useEffect } from 'react';
import { GraduateForm } from '../../../constants/type';
import { positions } from '../../../utils/material.utils';
import { MultiSelect } from '../../ui';
import { Briefcase } from 'lucide-react';

interface Props {
  form: GraduateForm;
  onChange: (patch: Partial<GraduateForm>) => void;
  onNext: () => void;
  onBack: () => void;
}

const RoleSelection: React.FC<Props> = ({ form, onChange, onNext }) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    form.roles || []
  );

  // Keep form and state in sync if form.roles changes from outside
  useEffect(() => {
    setSelectedRoles(form.roles || []);
  }, [form.roles]);

  const handleRolesChange = (values: string[]) => {
    setSelectedRoles(values);
    onChange({ roles: values });
  };

  const positionOptions = positions.map((pos) => ({
    value: pos.value,
    label: pos.label,
  }));

  return (
    <div className="relative flex items-center justify-center w-full flex-col gap-[30px] font-inter max-w-[900px] mx-auto">
      {/* Header with Icon */}
      <div className="flex flex-col items-center w-full gap-4 text-center">
        <div className="w-20 h-20 rounded-full bg-button/10 flex items-center justify-center">
          <Briefcase className="w-10 h-10 text-button" strokeWidth={1.5} />
        </div>
        <div className="flex flex-col gap-2.5">
          <h2 className="font-semibold text-[32px] text-[#1C1C1C]">
            Select your Role
          </h2>
          <p className="font-normal text-[18px] text-[#1C1C1CBF] max-w-[600px] mx-auto">
            Choose the positions that best match your skills and career goals.
            You can select multiple roles.
          </p>
        </div>
      </div>

      {/* Card Container with Multi-Select */}
      <div className="w-full bg-white rounded-[20px] border border-[#1B77001A] p-6 md:p-8 shadow-[0_18px_40px_-24px_rgba(47,81,43,0.12)]">
        <div className="flex flex-col gap-4">
          <MultiSelect
            label="Positions"
            required
            options={positionOptions}
            value={selectedRoles}
            onChange={handleRolesChange}
            placeholder="Select one or more positions"
            maxHeight="400px"
          />

          {/* Selection Feedback */}
          {selectedRoles.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-button/10 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-button"></div>
                <span className="text-[14px] font-medium text-[#1C1C1C]">
                  {selectedRoles.length}{' '}
                  {selectedRoles.length === 1 ? 'position' : 'positions'}{' '}
                  selected
                </span>
              </div>
            </div>
          )}

          {/* Helpful Tip */}
          <div className="mt-2 p-3 bg-[#F8F8F8] rounded-lg border border-[#D9E6C9]">
            <p className="text-[13px] text-[#1C1C1C80]">
              💡 <strong>Tip:</strong> Select all positions that interest you.
              This helps us match you with the best opportunities.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Button */}
      <button
        onClick={onNext}
        disabled={selectedRoles.length === 0}
        className={`rounded-[10px] text-[16px] p-[18px] font-medium transition-all duration-200 w-full max-w-[400px] shadow-sm ${
          selectedRoles.length === 0
            ? 'bg-[#1c770092] text-[#F8F8F8] cursor-not-allowed'
            : 'bg-button text-[#F8F8F8] hover:bg-button/90 hover:shadow-md transform hover:-translate-y-0.5'
        }`}
      >
        Continue
      </button>
    </div>
  );
};

export default RoleSelection;
