import { ChangeEvent } from 'react';

export interface CompanyInfoData {
  companyName: string;
  industry: string;
  companySize: string;
  location: string;
}

interface CompanyInfoProps {
  formData: CompanyInfoData;
  onInputChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const CompanyInfo = ({ formData, onInputChange }: CompanyInfoProps) => {
  return (
    <div className="flex flex-col gap-[20px] rounded-[20px] border border-[#1B77001A] bg-white p-[28px] shadow-[0_18px_40px_-24px_rgba(47,81,43,0.12)]">
      <div className="flex flex-col gap-[8px]">
        <label className="text-[16px] font-medium text-[#1C1C1C]">
          Company name
        </label>
        <input
          type="text"
          name="companyName"
          value={formData.companyName}
          onChange={onInputChange}
          placeholder="Enter company name"
          className="h-[60px] rounded-[14px] border border-[#D9E6C9] bg-[#F8F8F8] px-[18px] text-[16px] text-[#1C1C1C] placeholder:text-[#1C1C1C66] focus:border-button focus:outline-none"
          required
        />
      </div>

      <div className="flex flex-col gap-[8px]">
        <label className="text-[16px] font-medium text-[#1C1C1C]">
          Industry
        </label>
        <select
          name="industry"
          value={formData.industry}
          onChange={onInputChange}
          className="h-[60px] rounded-[14px] border border-[#D9E6C9] bg-[#F8F8F8] px-[18px] text-[16px] text-[#1C1C1C] focus:border-button focus:outline-none"
          required
        >
          <option value="">Industry type</option>
          <option value="Technology">Technology</option>
          <option value="Finance">Finance</option>
          <option value="Healthcare">Healthcare</option>
          <option value="Education">Education</option>
          <option value="Retail">Retail</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="flex flex-col gap-[8px]">
        <label className="text-[16px] font-medium text-[#1C1C1C]">
          Company size
        </label>
        <select
          name="companySize"
          value={formData.companySize}
          onChange={onInputChange}
          className="h-[60px] rounded-[14px] border border-[#D9E6C9] bg-[#F8F8F8] px-[18px] text-[16px] text-[#1C1C1C] focus:border-button focus:outline-none"
          required
        >
          <option value="">Select size</option>
          <option value="1-10">1-10 employees</option>
          <option value="11-50">11-50 employees</option>
          <option value="51-200">51-200 employees</option>
          <option value="201-500">201-500 employees</option>
          <option value="500+">500+ employees</option>
        </select>
      </div>

      <div className="flex flex-col gap-[8px]">
        <label className="text-[16px] font-medium text-[#1C1C1C]">
          Location
        </label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={onInputChange}
          placeholder="City/State"
          className="h-[60px] rounded-[14px] border border-[#D9E6C9] bg-[#F8F8F8] px-[18px] text-[16px] text-[#1C1C1C] placeholder:text-[#1C1C1C66] focus:border-button focus:outline-none"
          required
        />
      </div>
    </div>
  );
};

export default CompanyInfo;
