import {  useMemo } from 'react';
import CompanyCard, {Company} from '../components/explore/CompanyCard';
import { companies } from '../data/companies';




const GraduateDashboard = () => {



  const getRandom = (arr: Company[], n: number) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  };


  const availableCompanies = useMemo(() => getRandom(companies, 4), []);
  const contractCompanies = useMemo(() => getRandom(companies, 4), []);

  const handleButtonClick = (companyName: string, buttonText: string) => {
    console.log(`${buttonText} clicked for ${companyName}`);
  };

  return (
    <div className='py-[35px] px-[20px] pb-[120px] lg:px-[150px] flex flex-col gap-[43px] items-start justify-center bg-[#F9F9F9]'>

      
    <div className='flex flex-col gap-[20px] w-full md:gap-[30px]'>
      <p className='font-medium text-[22px] text-[#1C1C1C]'>
          Available Opportunites
        </p>
     
      <div className='grid grid-cols-1    md:grid-cols-2 lg:grid-cols-4 gap-8  w-full'>
        {availableCompanies.map((company, index) => (
          <CompanyCard
            key={index}
            company={company}
            buttonText="Preview"
            onButtonClick={() => handleButtonClick(company.name, index === 0 ? "Preview" : "Get in Touch")}
          />
        ))}
      </div>
    </div>
    <div className='flex flex-col gap-[20px] w-full md:gap-[30px]'>
      <p className='font-medium text-[22px] text-[#1C1C1C]'>
          Contract offers
        </p>
     
      <div className='grid grid-cols-1    md:grid-cols-2 lg:grid-cols-4 gap-8  w-full'>
        {contractCompanies.map((company, index) => (
          <CompanyCard
            key={index}
            company={company}
            buttonText="Get in Touch"
            onButtonClick={() => handleButtonClick(company.name, index === 0 ? "Preview" : "Get in Touch")}
          />
        ))}
      </div>
    </div>
  </div>
  );
};

export default GraduateDashboard;
