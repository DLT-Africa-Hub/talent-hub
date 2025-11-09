
import CompanyCard from '../components/explore/CompanyCard';
import { companies } from '../data/companies';


const GraduateApplications = () => {
    
      return (
        <div className='py-[35px] px-[20px] pb-[120px] lg:px-[150px] flex flex-col gap-[43px] items-start justify-center bg-[#F9F9F9]'>
          
          <div className='flex flex-col gap-[20px] w-full md:gap-[30px]'>
           
            <div className='grid grid-cols-1    md:grid-cols-2 lg:grid-cols-4 gap-8  w-full'>
              {companies.map((company, index) => (
                <CompanyCard
                  key={index}
                  company={company}
                  buttonText="Preview"
                 
                />
              ))}
            </div>
          </div>
        </div>
      )
}

export default GraduateApplications