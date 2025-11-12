import React, { useState } from "react";
import { PiGraduationCap, PiBuildingApartmentLight } from "react-icons/pi";

interface Role {
  role: string;
  description: string;
  tags: string[];
}

const AccountType: React.FC  = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const roles: Role[] = [
    {
        role: "Bootcamp Graduate",
        description: "Take an AI assessment and get matched with top companies",
        tags: ["Free Assessment", "AI Matching"],
      },
    {
      role: "Company",
      description: "Access pre-vetted bootcamp talent ready to hire",
      tags: ["Free Assessment", "AI Matching"],
    },
   
  ];

  const handleSelect = (role: string) => {
    setSelectedRole(role);
  };

  return (
    <div className="flex flex-col relative items-center justify-center h-screen bg-form bg-cover bg-center  md:py-[80px] md:px-[150px] font-inter">
         <div className="absolute inset-0 bg-white/50"></div>
      <div className="flex flex-col md:items-center pt-[75px] z-10 px-5 md:justify-center h-full w-full rounded-[50px] md:py-[124px] gap-[74px]">
        <div className="flex flex-col gap-2.5 text-left md:text-left justify-center">
          <p className="font-semibold text-[32px]">Account type</p>
          <p className="font-normal text-[#1C1C1CBF] text-[18px]">
            Select your account type
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-6">
          {roles.map((role) => {
            const isSelected = selectedRole === role.role;

            return (
              <div
                key={role.role}
                onClick={() => handleSelect(role.role)}
                className={`px-[25.5px] pt-[20px] pb-[32px] flex gap-[15px] md:items-center cursor-pointer transition-all duration-200 border-[1px]
                  ${
                    isSelected
                      ? "bg-[#EFFFE2] border-[#01732bd4]"
                      : "bg-[#EFFFE2] border-[#1E950033]"
                  }`}
              >
                <div
                  className={`flex h-[60px] w-[60px] items-center justify-center rounded-full ${
                    role.role === "Company" ? "bg-button" : "bg-button"
                  }`}
                >
                  {role.role === "Company" ? (
                    <PiBuildingApartmentLight size={24} className="text-white" />
                  ) : (
                    <PiGraduationCap size={24} className="text-white" />
                  )}
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="max-w-[274px]">
                    <div className="flex flex-col gap-2.5 text-left">
                      <p
                        className="font-inter font-medium text-[18px] text-button"
                      >
                        {role.role}
                      </p>
                      <p
                        className="font-inter font-normal text-[14px] text-button"
                      >
                        {role.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    {role.tags.map((tag) => (
                      <div
                        key={tag}
                        className={`border-[1px] rounded-[20px] py-1 px-2 text-[12px] ${
                             role.role === "Company"
                            ? "border-button text-button"
                            : "border-button text-button"
                        }`}
                      >
                        {tag}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          className={`md:w-[400px] rounded-[10px] text-[16px] p-[18px] font-medium transition-all duration-200 ${
            selectedRole
              ? "bg-button text-[#F8F8F8]"
              : "bg-[#6fc406] text-[#F8F8F8] cursor-not-allowed"
          }`}
          disabled={!selectedRole}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default AccountType;
