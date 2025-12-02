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
    <div className="flex items-center gap-6 p-5 border border-fade rounded-[12px] bg-white hover:border-button/30 hover:shadow-lg transition-all duration-200 group cursor-pointer" onClick={() => handleButtonClick(company.id, buttonText === 'Preview' ? 'Preview' : 'Get in Touch')}>
      {/* Company Image */}
      <div className="w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] relative overflow-hidden rounded-[12px] shrink-0 group-hover:scale-105 transition-transform duration-300">
        <ImageWithFallback
          src={company.image}
          alt={company.name}
          className="object-cover w-full h-full"
          defaultImage="job"
        />
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[16px] border border-white/50 p-2 rounded-full shadow-md">
          <PiBuildingApartmentLight className="text-[#1C1C1C]" />
        </div>
        {/* Match Badge Overlay */}
        <div className="absolute top-2 right-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/50 shadow-md backdrop-blur-sm ${badgeConfig.container}`}
          >
            <span className={`w-2 h-2 rounded-full ${badgeConfig.dot}`} />
            <span className="text-[12px] font-semibold whitespace-nowrap">
              {company.match}%
            </span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Company Name and Job Title */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <h3 className="font-semibold text-[20px] sm:text-[22px] text-[#1C1C1C] line-clamp-1">
              {company.name}
            </h3>
            <p className="font-medium text-[16px] sm:text-[17px] text-[#1C1C1C80] line-clamp-1">
              {company.role}
            </p>
          </div>
        </div>

        {/* Job Details */}
        <div className="flex flex-col gap-3">
          {/* Contract Type and Location */}
          <div className="flex items-center gap-3 text-[15px] text-[#1C1C1CBF]">
            <span className="font-medium text-[#1C1C1C]">{company.contract}</span>
            <span className="h-3 w-px bg-[#1C1C1C30]" />
            <span className="truncate">{company.location}</span>
          </div>

          {/* Salary - Prominent Display */}
          {company.wage && company.wage !== '—' && (
            <div className="flex items-center gap-2 p-3 rounded-[8px] bg-[#EFFFE2] border border-[#1B77001A] w-fit">
              <span className="text-[15px] font-semibold text-button">
                {company.wage.split(' ')[0]}
                {company.wage.includes('Annual') || company.wage.includes('Project') ? (
                  <span className="text-[13px] font-medium text-[#1B770080] ml-1.5">
                    {company.wage.includes('Annual') ? 'Annual' : 'Project'}
                  </span>
                ) : null}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleButtonClick(
              company.id,
              buttonText === 'Preview' ? 'Preview' : 'Get in Touch'
            );
          }}
          className="h-[48px] px-6 cursor-pointer bg-button rounded-[10px] text-white flex items-center justify-center gap-2 font-semibold transition-all duration-200 hover:bg-[#176300] hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md text-[14px] sm:text-[15px] whitespace-nowrap"
        >
          <CiMail
            className={`text-[18px] ${buttonText === 'Preview' && 'hidden'}`}
          />
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default CompanyFlatCard;
