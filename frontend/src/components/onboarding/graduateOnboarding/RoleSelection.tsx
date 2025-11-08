import React, { useState, useEffect } from "react";
import { GraduateForm } from "../../../constants/type";
import { IoMdArrowBack } from "react-icons/io";

interface Props {
  form: GraduateForm;
  onChange: (patch: Partial<GraduateForm>) => void;
  onNext: () => void;
  onBack: () => void;
}

const RoleSelection: React.FC<Props> = ({ form, onChange, onBack, onNext }) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(form.roles || []);

  const roles: string[] = [
    "FrontEnd Developer",
    "BackEnd Developer",
    "Full Stack Developer",
    "Product Manager",
    "Blockchain Developer",
  ];

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
      <div className="flex flex-col gap-2.5 justify-center items-center w-full">
        {roles.map((role) => {
          const isSelected = selectedRoles.includes(role);
          return (
            <button
              key={role}
              type="button"
              onClick={() => handleSelectRole(role)}
              className={`flex items-center border-[1px] p-5 gap-2.5 rounded-xl w-full max-w-[542px] justify-start transition-all duration-200 ${
                isSelected
                  ? "border-[#2E5EAA]"
                  : "border-[#C8D7EFE5] bg-white"
              }`}
            >
              <div
                className={`rounded-full h-5 w-5 p-1 border-[1px] flex items-center justify-center ${
                  isSelected ? "border-[#2E5EAA]" : "border-[#C8D7EFE5]"
                }`}
              >
                {isSelected && (
                  <div className="h-full w-full bg-[#2E5EAA] rounded-full" />
                )}
              </div>
              <p className="text-[#1C1C1C]">{role}</p>
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
              ? "bg-[#A9B9D3] text-[#F8F8F8] cursor-not-allowed"
              : "bg-[#2E5EAA] text-[#F8F8F8]"
          }`}
        >
          Continue
        </button>
 
    </div>
  );
};

export default RoleSelection;
