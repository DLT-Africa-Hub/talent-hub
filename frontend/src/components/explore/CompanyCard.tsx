import { PiBuildingApartmentLight } from 'react-icons/pi';

export interface Company {
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
}

const CompanyCard: React.FC<CompanyCardProps> = ({ 
  company, 
  buttonText = "Preview",
  onButtonClick 
}) => {
  return (
    <div className='flex flex-col items-center justify-between gap-[16px] py-[18px] px-[17px] border border-[#2E5EAA33] rounded-[10px] bg-white'>
      <div className='w-full h-[232px] relative'>
        <img src={company.image} className='object-cover w-full h-full rounded-[10px]' alt={company.name} />
        <div className='absolute top-2 left-2 bg-white/20 backdrop-blur-xs text-[18px] border border-white/30 p-[12px] rounded-full shadow-lg'>
          <PiBuildingApartmentLight className='text-[#F8F8F8]'/>
        </div>
      </div>
      <div className="flex justify-between w-full">
        <div className="flex flex-col gap-[5px]">
          <p className="font-semibold text-[24px] max-w-[114px] text-[#1C1C1C]">{company.name}</p>
          <p className="font-sf font-normal text-[16px] text-[#1C1C1CBF]">{company.role}</p>
        </div>
        <div className="flex items-center  h-[49px] bg-[#2E5EAA33] py-[15px] px-6 rounded-[70px]">
          {company.match}% match
        </div>
      </div>
      <div className="flex w-full">
        <p className="text-center w-[100px] font-semibold text-[16px]">
          {company.contract}
        </p>
        <p className="text-center border-r-2 border-l-2 font-semibold w-[100px]">
          {company.location}
        </p>
        <p className="text-center font-semibold w-[100px]">
          {company.wage} {company.wageType}
        </p>
      </div>
      <button 
        onClick={onButtonClick}
        className="h-[55px] bg-button w-full rounded-[10px] text-[#F8F8F8] font-medium transition-all duration-200 hover:bg-[#A9B9D3]"
      >
        {buttonText}
      </button>
    </div>
  );
};

export default CompanyCard;

