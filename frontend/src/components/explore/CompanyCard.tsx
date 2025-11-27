import { CiMail } from 'react-icons/ci';
import { PiBuildingApartmentLight } from 'react-icons/pi';
import { getMatchBadgeVariant, getMatchBadgeLabel } from '../ui/Badge';
import { ImageWithFallback } from '../ui';

export interface Company {
  id: number;
  jobId?: string;
  name: string;
  role: string;
  match: number;
  contract: string;
  location: string;
  wageType: string;
  wage: string;
  image: string;
  description?: string; 
}

interface CompanyCardProps {
  company: Company;
  buttonText?: string;
  onButtonClick?: () => void;
  onPreviewClick?: (companyId: number) => void;
}

// Uses Badge component utilities for consistency
export const getMatchBadgeConfig = (score: number) => {
  const variant = getMatchBadgeVariant(score);
  const label = getMatchBadgeLabel(score);
  
  const variantMap: Record<string, { container: string; dot: string }> = {
    'match-great': {
      container: 'bg-[#ECFDF3] text-[#0F6B38]',
      dot: 'bg-[#22C55E]',
    },
    'match-strong': {
      container: 'bg-[#E0F2FE] text-[#0C4A6E]',
      dot: 'bg-[#38BDF8]',
    },
    'match-good': {
      container: 'bg-[#FEF3C7] text-[#92400E]',
      dot: 'bg-[#FBBF24]',
    },
    'match-fair': {
      container: 'bg-[#F3F4F6] text-[#1F2937]',
      dot: 'bg-[#9CA3AF]',
    },
  };

  return {
    label,
    ...variantMap[variant],
  };
};

const CompanyCard: React.FC<CompanyCardProps> = ({
  company,
  buttonText = 'Preview',
  onPreviewClick,
  onButtonClick,
}) => {
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

  const badgeConfig = getMatchBadgeConfig(company.match);

  return (
    <div className="flex flex-col items-center justify-between gap-[16px] w-full py-[18px] px-[17px] border border-fade rounded-[10px] bg-white hover:border-button/30 hover:shadow-lg transition-all duration-200 group">
      <div className="w-full h-[180px] sm:h-[200px] md:h-[232px] relative">
        <ImageWithFallback
          src={company.image}
          className="object-cover w-full h-full rounded-[10px]"
          alt={company.name}
          defaultImage="job"
        />
        <div className="absolute top-2 left-2 bg-white/20 backdrop-blur-xs text-[18px] border border-white/30 p-[12px] rounded-full shadow-lg">
          <PiBuildingApartmentLight className="text-[#F8F8F8]" />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row justify-between w-full gap-3 sm:gap-0">
        <div className="flex flex-col gap-[5px] flex-1 min-w-0">
          <p className="font-semibold text-[20px] sm:text-[24px] text-[#1C1C1C] truncate">
            {company.name}
          </p>
          <p className="font-sf font-normal text-[14px] sm:text-[16px] text-[#1C1C1CBF] truncate">
            {company.role}
          </p>
        </div>
        <div
          className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 h-[50px] leading-none rounded-[9999px] border border-transparent shadow-sm flex-shrink-0 ${badgeConfig.container}`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${badgeConfig.dot}`} />
          <div className="flex flex-col leading-tight">
            <span className="text-[12px] sm:text-[14px] font-semibold whitespace-nowrap">
              {company.match}% match
            </span>
            <span className="text-[10px] sm:text-[12px] opacity-80 whitespace-nowrap">{badgeConfig.label}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row w-full items-center justify-between gap-2 sm:gap-0">
        <p className="text-center sm:text-left w-full sm:w-auto font-semibold text-[14px] sm:text-[16px]">
          {company.contract}
        </p>
        <div className="hidden sm:block h-[20px] bg-black w-0.5" />
        <p className="text-center sm:text-center font-semibold w-full sm:w-auto text-[14px] sm:text-[16px]">{company.location}</p>
        <div className="hidden sm:block h-[20px] bg-black w-0.5" />
        <p className="text-center sm:text-right font-semibold w-full sm:w-auto text-[14px] sm:text-[16px]">
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
        className="h-[50px] sm:h-[55px] cursor-pointer bg-button w-full rounded-[10px] text-[#F8F8F8] flex items-center justify-center gap-2.5 font-medium transition-all duration-200 hover:bg-[#176300] hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg text-[14px] sm:text-[16px]"
      >
        <CiMail
          className={`text-[20px] sm:text-[24px] ${buttonText === 'Preview' && 'hidden'}`}
        />
        {buttonText}
      </button>
    </div>
  );
};

export default CompanyCard;
