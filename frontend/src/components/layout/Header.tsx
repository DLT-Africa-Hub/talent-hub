import React from 'react'
import { RiHomeSmile2Line } from 'react-icons/ri'




const Header = () => {
   



  return (
    <div className='hidden lg:flex items-center gap-[43px] sticky z-10 top-0 w-full h-[130px] font-inter'>
        <div className='p-[50px] flex items-center justify-center gap-[5px] text-[24px] font-medium text-[#1C1C1C] border border-[#1B770033] rounded-br-[20px] bg-[#F8F8F8]'>
            <RiHomeSmile2Line className='text-button'/>
            <p>Talent Match</p>
        </div>
        <div className='flex items-center justify-between px-[30px] py-[50px] bg-[#F8F8F8]  h-full flex-grow border border-[#1B770033]  rounded-bl-[20px]'>

        <p className='font-medium text-[22px] text-[#1c1c1c]'>
          Hi, Oluwaseyi

        </p>

        <div className="flex w-full md:w-auto items-center  flex-wrap gap-5 ">
          <div className="flex items-center justify-center rounded-[10px] border border-fade py-[15px] px-[26.5px] gap-[10px]">
                <p className="font-medium text-[24px] text-[#F8F8F8] w-[50px] h-[50px] rounded-[10px] bg-button flex items-center justify-center">A</p>

                <div className="flex flex-col text-center">
                  <p className="text-[#1C1C1CBF] font-normal text-[16px]">
                  Your Rank
                  </p>
                  <p className="text-[#1C1C1CE5] font-bold  text-[20px]">
                  85%
                  </p>
                </div>
          </div>
          <div className="flex items-center justify-center rounded-[10px] border border-fade py-[15px] px-[26.5px] gap-[10px]">

                <div className="flex flex-col text-center">
                  <p className="text-[#1C1C1CBF] font-normal text-[16px]">
                  Experience Level
                  </p>
                  <p className="text-[#1C1C1CE5] font-bold  text-[20px]">
                  3-5 years
                  </p>
                </div>
          </div>
            
        </div>
            
        </div>
        
    </div>
  )
}

export default Header