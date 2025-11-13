import { CiMail } from 'react-icons/ci';
import { PiBuildingApartmentLight } from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';

export interface Company {
  id:number;
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
 
}) => {

  const navigate =useNavigate()

  const handleButtonClick = (companyId: number, buttonText: string) => {
    console.log(companyId)
    if(buttonText === "Preview"){
      navigate(`/explore-preview/${companyId}`)
    }
    if(buttonText === "Get in Touch"){
      navigate(`/contactCompany/${companyId}`)
    }

    
  };

  return (
    <div className='flex flex-col items-center justify-between gap-[16px] max-w-[400px] py-[18px] px-[17px] border border-fade rounded-[10px] bg-white'>
      <div className='w-full h-[232px] relative'>
        <img src={company.image} className='object-cover w-full h-full rounded-[10px]' alt={company.name} />
        <div className='absolute top-2 left-2 bg-white/20 backdrop-blur-xs text-[18px] border border-white/30 p-[12px] rounded-full shadow-lg'>
          <PiBuildingApartmentLight className='text-[#F8F8F8]'/>
        </div>
      </div>
      <div className="flex justify-between w-full">
        <div className="flex flex-col gap-[5px]">
          <p className="font-semibold text-[24px] max-w-[114px] text-[#1C1C1C]">{company.name}</p>
          <p className="font-sf font-normal text-[16px] max-w-[114px]  text-[#1C1C1CBF]">{company.role}</p>
        </div>
        <div className="flex items-center  h-[49px]  bg-fade text-[#1C1C1CBF] text-[16px]  py-[15px] px-6 rounded-[70px]">
          {company.match}% match
        </div>
      </div>
      <div className="flex w-full items-center justify-between">
        <p className="text-center w-full font-semibold text-[16px]">
          {company.contract}
        </p>
        <div className='h-[20px] bg-black w-0.5'/>
        <p className="text-center  font-semibold w-full">
          {company.location}
        </p>
        <div className='h-[20px] bg-black w-0.5'/>
        <p className="text-center font-semibold w-full">
          {company.wage} {company.wageType}
        </p>
      </div>
      <button 
        onClick={() => handleButtonClick(company.id, buttonText === "Preview"  ? "Preview" : "Get in Touch")}
        className="h-[55px] cursor-pointer bg-button w-full rounded-[10px] text-[#F8F8F8] flex items-center justify-center gap-2.5 font-medium transition-all duration-200 hover:bg-[#A9B9D3]"
      >
           <CiMail className={`text-[24px] ${buttonText === "Preview" && "hidden"}`}/>
        {buttonText}
      </button>
    </div>
  );
};

export default CompanyCard;

