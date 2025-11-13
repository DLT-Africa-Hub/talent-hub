import React, { useState, useEffect, useMemo } from "react";
import { GraduateForm } from "../../../constants/type";
import { countryCodes } from "../../../utils/material.utils";

interface Props {
  form: GraduateForm;
  onChange: (patch: Partial<GraduateForm>) => void;
  onNext: () => void;
}

  

const experienceLevels = ["Junior", "Intermediate", "Senior"];
const experienceYears = ["0–1 year", "1–3 years", "3–5 years", "5+ years"];

const Personalnfo: React.FC<Props> = ({ form, onChange, onNext }) => {
 
  const [countryCode, setCountryCode] = useState("+234");
  const [localPhone, setLocalPhone] = useState("");

 
  useEffect(() => {
    const combined = `${countryCode}${localPhone.replace(/\s+/g, "")}`;
    onChange({ phoneNo: combined });
  }, [countryCode, localPhone]);


  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    onChange({ [name]: value });
  };

  
  const isFormComplete = useMemo(() => {
    return (
      form.firstName.trim() !== "" &&
      form.lastName.trim() !== "" &&
      form.rank.trim() !== "" &&
      form.yearsOfExperience.trim() !== "" &&
      localPhone.trim() !== ""
    );
  }, [form.firstName, form.lastName, form.rank, form.yearsOfExperience, localPhone]);

  return (
    <div className="flex items-center justify-center w-full flex-col gap-[30px] font-inter">
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
        className="flex flex-col gap-2.5 items-center justify-center w-full"
        onSubmit={(e) => {
          e.preventDefault();
          if (isFormComplete) onNext();
        }}
      >
        {/* First Name */}
        <div className="w-full flex flex-col gap-[10px] max-w-[542px]">
          <label className="text-[#1C1C1CBF] text-[18px] font-normal">
            First Name
          </label>
          <input
            type="text"
            placeholder="John"
            name="firstName"
            value={form.firstName}
            onChange={handleInputChange}
            className="h-[62px] border border-fade rounded-xl w-full px-5 bg-[#FFFFFF] placeholder:text-[#1C1C1C33]"
          />
        </div>

        {/* Last Name */}
        <div className="w-full flex flex-col gap-[10px] max-w-[542px]">
          <label className="text-[#1C1C1CBF] text-[18px] font-normal">
            Last Name
          </label>
          <input
            type="text"
            placeholder="Doe"
            name="lastName"
            value={form.lastName}
            onChange={handleInputChange}
            className="h-[62px] border border-fade rounded-xl w-full px-5 bg-[#FFFFFF] placeholder:text-[#1C1C1C33]"
          />
        </div>

        {/* Phone Number */}
        <div className="w-full flex flex-col gap-[10px] max-w-[542px]">
          <label className="text-[#1C1C1CBF] text-[18px] font-normal">
            Phone Number
          </label>
          <div className="flex items-center border border-fade rounded-xl bg-[#FFFFFF]">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="h-[62px] px-3 border-r border-fade bg-transparent text-[24px] focus:outline-none"
            >
              {countryCodes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} 
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="816 921 1501"
              value={localPhone}
              onChange={(e) => setLocalPhone(e.target.value)}
              className="h-[62px] w-full px-5 bg-transparent placeholder:text-[#1C1C1C33] focus:outline-none"
            />
          </div>
        </div>

        {/* Experience Level */}
        <div className="w-full flex flex-col gap-[10px] max-w-[542px]">
          <label className="text-[#1C1C1CBF] text-[18px] font-normal">
            Experience Level
          </label>
          <select
            name="rank"
            value={form.rank}
            onChange={handleInputChange}
            className="h-[62px] border border-fade rounded-xl w-full px-5 bg-[#FFFFFF] text-[#1C1C1C] focus:outline-none"
          >
            <option value="">Select level</option>
            {experienceLevels.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>

        {/* Years of Experience */}
        <div className="w-full flex flex-col gap-[10px] max-w-[542px]">
          <label className="text-[#1C1C1CBF] text-[18px] font-normal">
            Years of Experience
          </label>
          <select
            name="yearsOfExperience"
            value={form.yearsOfExperience}
            onChange={handleInputChange}
            className="h-[62px] border border-fade rounded-xl w-full px-5 bg-[#FFFFFF] text-[#1C1C1C] focus:outline-none"
          >
            <option value="">Select range</option>
            {experienceYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

       
      </form>
       {/* Continue Button */}
       <button
         onClick={onNext}
          disabled={!isFormComplete}
          className={`md:w-[400px] rounded-[10px] text-[16px] p-[18px] font-medium transition-all duration-200 w-full ${
            isFormComplete
              ? "bg-button text-[#F8F8F8]"
              : "bg-[#1c770092] text-[#F8F8F8] cursor-not-allowed"
          }`}
        >
          Continue
        </button>
    </div>
  );
};

export default Personalnfo;
