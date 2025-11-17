
import React, { useState, useEffect } from "react";
import { GraduateForm } from "../../../constants/type";
import { positions } from "../../../utils/material.utils";




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

  const handleSelectRole = (role: string) => {
    let updatedRoles: string[];

    if (selectedRoles.includes(role)) {
      updatedRoles = selectedRoles.filter((r) => r !== role);
    } else {
      updatedRoles = [...selectedRoles, role];
    }

    setSelectedRoles(updatedRoles);
    onChange({ roles: updatedRoles });
  };

  // Keep form and state in sync if form.roles changes from outside
  useEffect(() => {
    setSelectedRoles(form.roles || []);
  }, [form.roles]);

  return (
    <div className=" relative flex items-center justify-center w-full flex-col gap-[30px] font-inter">
      {/* Header */}
      <div className="flex flex-col w-full gap-2.5 text-left md:text-center">
        <h2 className="font-semibold text-[32px] text-[#1C1C1C]">
          Select your Role
        </h2>
        <p className="font-normal text-[18px] text-[#1C1C1CBF]">
          Tell us more about you
        </p>
      </div>

      {/* Roles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-4 justify-center w-full max-w-[900px]">
        {positions.map((position) => {
          const isSelected = selectedRoles.includes(position.value);
          return (
            <button
              key={position.value}
              type="button"
              onClick={() => handleSelectRole(position.value)}
              className={`flex items-center border p-5 gap-2.5 rounded-xl w-full justify-start transition-all duration-200 ${
                isSelected ? 'border-button  bg-white' : 'border-fade'
              }`}
            >
              <div
                className={`rounded-full h-5 w-5 p-1 border flex items-center justify-center ${
                  isSelected ? 'border-button' : 'border-fade'
                }`}
              >
                {isSelected && (
                  <div className="h-full w-full bg-button rounded-full" />
                )}
              </div>
              <p className="text-[#1C1C1C]">{position.label}</p>
            </button>
          );
        })}
      </div>

      {/* Navigation Buttons */}

      <button
        onClick={onNext}
        disabled={selectedRoles.length === 0}
        className={`rounded-[10px] text-[16px] p-[18px] font-medium transition-all duration-200  w-full max-w-[400px] ${
          selectedRoles.length === 0
            ? 'bg-[#1c770092] text-[#F8F8F8] cursor-not-allowed'
            : 'bg-button text-[#F8F8F8]'
        }`}
      >
        Continue
      </button>
    </div>
  );
};

export default RoleSelection;
