import React from 'react';
import { CiMail } from 'react-icons/ci';
import { PiBuildingApartmentLight } from 'react-icons/pi';
import { Company, getMatchBadgeConfig } from './CompanyCard';
import { ImageWithFallback } from '../ui';

interface CompanyCardProps {
  company: Company;
  buttonText?: string;
  onButtonClick?: () => void;
  onPreviewClick?: (companyId: number) => void;
}

const CompanyFlatCard: React.FC<CompanyCardProps> = ({
  company,
  buttonText = 'Preview',
  onPreviewClick,
  onButtonClick,
}) => {
  const badgeConfig = getMatchBadgeConfig(company.match);

  const handleButtonClick = (companyId: number, label: string) => {
    // Custom handler takes priority
    if (onButtonClick) {
      onButtonClick();
      return;
    }

    // For Preview, use onPreviewClick callback (modal)
    if (label === 'Preview') {
      if (onPreviewClick) {
        onPreviewClick(companyId);
      } else {
        console.warn('Preview clicked but no onPreviewClick handler provided');
      }
      return;
    }

    // For other actions, ensure a handler is provided
    if (label === 'Get in Touch' || label === 'Apply') {
      console.warn(`"${label}" action requires onButtonClick handler`);
    }
  };
  return (
    <div className="flex items-center gap-[26px] max-w-[878px] py-[18px] px-[17px] border border-fade rounded-[10px] bg-white hover:border-button/30 hover:shadow-md transition-all duration-200 group">
      <div className="w-[126px] aspect-square relative overflow-hidden rounded-[10px] ">
        <ImageWithFallback
          src={company.image}
          alt={company.name}
          className="object-cover w-full h-full"
        />
        <div className="absolute top-2 left-2 bg-white/20 backdrop-blur-sm text-[18px] border border-white/30 p-[8px] rounded-full shadow-lg">
          <PiBuildingApartmentLight className="text-white" />
        </div>
      </div>

      <div className='flex flex-col grow'>
      <div className="flex   gap-[81.5px]">
        <div className="flex flex-col gap-[5px]">
          <p className="font-semibold text-[24px] max-w-[114px] text-[#1C1C1C]">
            {company.name}
          </p>
          <p className="font-sf font-normal text-[16px]   text-[#1C1C1CBF]">
            {company.role}
          </p>
        </div>
        <div
          className={`flex items-center gap-3 px-4 h-[50px] leading-none rounded-[9999px] border border-transparent shadow-sm ${badgeConfig.container}`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${badgeConfig.dot}`}
          />
          <div className="flex flex-col leading-tight">
            <span className="text-[14px] font-semibold">
              {company.match}% match
            </span>
            <span className="text-[12px] opacity-80">
              {badgeConfig.label}
            </span>
          </div>
        </div>
      </div>

      <div className='flex items-center justify-center gap-[47px]'>
        <div className="flex w-full items-center justify-between">
          <p className="text-left w-full font-semibold text-[16px]">
            {company.contract}
          </p>
          <div className="h-[20px] bg-black w-0.5" />
          <p className="text-center  font-semibold w-full mx-2">
            {company.location}
          </p>
          <div className="h-[20px] bg-black w-0.5" />
        <p className="text-center font-semibold w-full">
          {company.wage}
        </p>
        </div>
        <button
          onClick={() =>
            handleButtonClick(
              company.id,
              buttonText === 'Preview' ? 'Preview' : 'Get in Touch'
            )
          }
          className="h-[55px] cursor-pointer bg-button w-full rounded-[10px] text-[#F8F8F8] flex items-center justify-center gap-2.5 font-medium transition-all duration-200 hover:bg-[#176300] hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
        >
          <CiMail
            className={`text-[24px] ${buttonText === 'Preview' && 'hidden'}`}
          />
          {buttonText}
        </button>
      </div>
      </div>
    </div>
  );
};

export default CompanyFlatCard;
