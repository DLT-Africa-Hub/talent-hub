import CompanyCard from '../components/explore/CompanyCard';
import CompanyFlatCard from '../components/explore/CompanyFlatCard';
import { companies } from '../data/companies';

const GraduateApplications = () => {
  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-100px)] px-[20px] lg:px-[40px] py-[20px] gap-[46px] overflow-hidden">
      
      {/* === MOBILE VIEW === */}
      <div className="flex flex-col gap-[40px] lg:hidden w-full">
        {/* Section 1 */}
        <div>
          <p className="font-medium text-[22px] text-[#1C1C1C] mb-[20px]">
            Job Applications
          </p>
          <div className="grid grid-cols-1 gap-6">
            {companies.map((company, index) => (
              <CompanyCard key={index} company={company} buttonText="Preview" />
            ))}
          </div>
        </div>

        {/* Section 2 */}
        <div>
          <p className="font-medium text-[22px] text-[#1C1C1C] mb-[20px]">
            Quick Apply
          </p>
          <div className="grid grid-cols-1 gap-6">
            {companies.map((company, index) => (
              <CompanyCard key={index} company={company} buttonText="Preview" />
            ))}
          </div>
        </div>
      </div>

      {/* === DESKTOP VIEW  === */}
      <div className="hidden lg:flex w-full justify-between gap-[46px]">
        {/* Left side: Job Applications */}
        <div className="flex flex-col gap-[20px] md:gap-[30px] w-[878px] h-full overflow-y-auto pr-2">
          <p className="font-medium text-[22px] text-[#1C1C1C]">
            Job Applications
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-8 w-full">
            {companies.map((company, index) => (
              <CompanyFlatCard key={index} company={company} buttonText="Preview" />
            ))}
          </div>
        </div>

        {/* Divider line */}
        <div className="h-full w-[1px] bg-gradient-to-b from-transparent via-fade to-transparent" />

        {/* Right side*/}
        <div className="flex flex-col gap-[20px] md:gap-[30px] h-full overflow-y-auto pr-2">
          <p className="font-medium text-[22px] text-[#1C1C1C]">
            Quick Apply
          </p>
          <div className="grid grid-cols-1 gap-8">
            {companies.map((company, index) => (
              <CompanyCard key={index} company={company} buttonText="Preview" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraduateApplications;
