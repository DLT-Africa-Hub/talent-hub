import { CiMail } from 'react-icons/ci';
import { PiBuildingApartmentLight } from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';

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
}

interface CompanyCardProps {
  company: Company;
  buttonText?: string;
  onButtonClick?: () => void;
  onPreviewClick?: (companyId: number) => void;
}

export const getMatchBadgeConfig = (score: number) => {
  const normalized = Math.min(100, Math.max(0, score));

  if (normalized >= 80) {
    return {
      label: 'Great fit',
      container: 'bg-[#ECFDF3] text-[#0F6B38]',
      dot: 'bg-[#22C55E]',
    };
  }

  if (normalized >= 60) {
    return {
      label: 'Strong fit',
      container: 'bg-[#E0F2FE] text-[#0C4A6E]',
      dot: 'bg-[#38BDF8]',
    };
  }

  if (normalized >= 40) {
    return {
      label: 'Good potential',
      container: 'bg-[#FEF3C7] text-[#92400E]',
      dot: 'bg-[#FBBF24]',
    };
  }

  return {
    label: 'Worth reviewing',
    container: 'bg-[#F3F4F6] text-[#1F2937]',
    dot: 'bg-[#9CA3AF]',
  };
};

const CompanyCard: React.FC<CompanyCardProps> = ({
  company,
  buttonText = 'Preview',
  onPreviewClick,
  onButtonClick,
}) => {
  const navigate = useNavigate();

  const handleButtonClick = (companyId: number, label: string) => {
    if (onButtonClick) {
      onButtonClick();
      return;
    }

    if (label === 'Preview') {
      if (onPreviewClick) {
        onPreviewClick(companyId);
      } else {
        navigate(`/explore-preview/${companyId}`);
      }
      return;
    }

    if (label === 'Get in Touch') {
      navigate(`/contactCompany/${companyId}`);
    }
  };

  const badgeConfig = getMatchBadgeConfig(company.match);

  return (
    <div className="flex flex-col items-center justify-between gap-[16px] max-w-[400px] py-[18px] px-[17px] border border-fade rounded-[10px] bg-white hover:border-button/30 hover:shadow-lg transition-all duration-200 group">
      <div className="w-full h-[232px] relative">
        <img
          src={company.image}
          className="object-cover w-full h-full rounded-[10px]"
          alt={company.name}
        />
        <div className="absolute top-2 left-2 bg-white/20 backdrop-blur-xs text-[18px] border border-white/30 p-[12px] rounded-full shadow-lg">
          <PiBuildingApartmentLight className="text-[#F8F8F8]" />
        </div>
      </div>
      <div className="flex justify-between w-full">
        <div className="flex flex-col gap-[5px]">
          <p className="font-semibold text-[24px] max-w-[114px] text-[#1C1C1C]">
            {company.name}
          </p>
          <p className="font-sf font-normal text-[16px] max-w-[114px]  text-[#1C1C1CBF]">
            {company.role}
          </p>
        </div>
        <div
          className={`flex items-center gap-3 px-4 py-2 rounded-[9999px] border border-transparent shadow-sm ${badgeConfig.container}`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${badgeConfig.dot}`} />
          <div className="flex flex-col leading-tight">
            <span className="text-[14px] font-semibold">
              {company.match}% match
            </span>
            <span className="text-[12px] opacity-80">{badgeConfig.label}</span>
          </div>
        </div>
      </div>
      <div className="flex w-full items-center justify-between">
        <p className="text-center w-full font-semibold text-[16px]">
          {company.contract}
        </p>
        <div className="h-[20px] bg-black w-0.5" />
        <p className="text-center  font-semibold w-full">{company.location}</p>
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
  );
};

export default CompanyCard;
