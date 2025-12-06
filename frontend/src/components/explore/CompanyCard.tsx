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

type MatchVariant =
  | 'match-great'
  | 'match-strong'
  | 'match-good'
  | 'match-fair';

const BADGE_STYLES: Record<MatchVariant, { container: string; dot: string }> = {
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

// eslint-disable-next-line react-refresh/only-export-components
export const getMatchBadgeConfig = (score: number) => {
  const variant = getMatchBadgeVariant(score) as MatchVariant;
  return {
    label: getMatchBadgeLabel(score),
    ...BADGE_STYLES[variant],
  };
};

const CompanyCard: React.FC<CompanyCardProps> = ({
  company,
  buttonText = 'Preview',
  onPreviewClick,
  onButtonClick,
}) => {
  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick();
      return;
    }

    if (buttonText === 'Preview' && onPreviewClick) {
      onPreviewClick(company.id);
    }
  };

  const badgeConfig = getMatchBadgeConfig(company.match);
  const showMailIcon = buttonText !== 'Preview';

  return (
    <div className="flex flex-col items-center justify-between gap-4 w-full p-[17px] sm:p-[18px] border border-fade rounded-[10px] bg-white hover:border-button/30 hover:shadow-lg transition-all duration-200">
      <div className="w-full h-[180px] sm:h-[200px] md:h-[232px] relative">
        <ImageWithFallback
          src={company.image}
          className="object-cover w-full h-full rounded-[10px]"
          alt={company.name}
          defaultImage="job"
        />

        <div className="absolute top-2 left-2 bg-white/20 backdrop-blur-xs border border-white/30 p-3 rounded-full shadow-lg">
          <PiBuildingApartmentLight className="text-[18px] text-[#F8F8F8]" />
        </div>

        <div
          className={`absolute top-2 right-2 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 h-[50px] rounded-full border border-transparent shadow-sm ${badgeConfig.container}`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${badgeConfig.dot}`} />
          <div className="flex flex-col leading-tight">
            <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">
              {company.match}% match
            </span>
            <span className="text-[10px] sm:text-xs opacity-80 whitespace-nowrap">
              {badgeConfig.label}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 w-full">
        <p className="font-semibold text-xl sm:text-2xl text-[#1C1C1C] truncate">
          {company.name}
        </p>
        <p className="font-sf font-normal text-sm sm:text-base text-[#1C1C1CBF] truncate">
          {company.role}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row w-full items-center justify-center gap-2 sm:gap-3 text-center">
        <p className="text-sm sm:text-base text-[#1C1C1CBF]">
          {company.contract}
        </p>
        <div className="hidden sm:block h-1 w-1 bg-[#1C1C1C33] rounded-full" />
        <p className="text-xs sm:text-sm text-[#1C1C1CBF]">
          {company.location}
        </p>
        <div className="hidden sm:block h-1 w-1 bg-[#1C1C1C33] rounded-full" />
        <p className="text-sm sm:text-base text-[#1C1C1CBF]">{company.wage}</p>
      </div>

      <button
        onClick={handleButtonClick}
        className="h-[50px] sm:h-[55px] w-full bg-button rounded-[10px] text-[#F8F8F8] flex items-center justify-center gap-2.5 font-medium text-sm sm:text-base transition-all duration-200 hover:bg-[#176300] hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
      >
        {showMailIcon && <CiMail className="text-xl sm:text-2xl" />}
        {buttonText}
      </button>
    </div>
  );
};

export default CompanyCard;
