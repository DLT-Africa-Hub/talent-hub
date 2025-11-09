import { BsSearch } from "react-icons/bs";
import { companies } from "../data/companies";
import CompanyCard from "../components/explore/CompanyCard";





const ExploreCompany = () => {

 
  



  return (
    <div className='py-[35px] px-[20px] pb-[120px] lg:px-[150px] flex flex-col gap-[43px] items-start justify-center bg-[#F9F9F9]'>
      <div className='flex gap-2.5 items-center text-[#2E5EAA80] px-5 py-[13.5px] border border-[#2E5EAA80] rounded-[50px] w-full max-w-[708px]'>
        <BsSearch/>
        <input type="text" className='w-full placeholder:text-[#2E5EAA80] text-[#1c1c1c] outline-none' placeholder='Search'/>
      </div>
      <div className='flex flex-col gap-[20px] w-full md:gap-[30px]'>
        <p className='font-medium text-[22px] text-[#1C1C1C]'>
          Available Opportunites
        </p>
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

export default ExploreCompany