import { BsSearch } from "react-icons/bs";

import CompanyFlatCard from "../../components/explore/CompanyFlatCard";
import CompanyCard from "../../components/explore/CompanyCard";
import { companies } from "../../data/companies";









const ExploreCompany = () => {

 
  



  return (
    <div className='py-[20px] px-[20px] pb-[120px] lg:px-0 lg:pr-[20px] flex flex-col gap-[43px] items-start justify-center '>
      
      <div className='flex flex-col gap-[20px] w-full md:gap-[30px]'>
       <div className=" flex flex-col-reverse gap-[43px] lg:flex-row justify-between items-start lg:items-center">
       <p className='font-medium text-[22px] text-[#1C1C1C]'>
          Available Opportunites
        </p>

        <div className='flex gap-2.5 items-center self-end text-fade px-5 py-[13.5px] border border-button rounded-[10px] w-full max-w-[708px]'>
        <BsSearch/>
        <input type="text" className='w-full placeholder:text-fade text-[#1c1c1c] outline-none' placeholder='Search'/>
      </div>
       </div>
        <div className=' hidden  lg:grid md:grid-cols-2 lg:grid-cols-1 gap-8   w-full'>
          {companies.map((company, index) => (
            <CompanyFlatCard 
              key={index}
              company={company}
              buttonText="Preview"
              
            />
          ))}
        </div>
        <div className='grid grid-cols-1  md:grid-cols-2  gap-8  lg:hidden w-full'>
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

export default ExploreCompany