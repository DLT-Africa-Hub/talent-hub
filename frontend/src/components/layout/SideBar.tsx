import React from 'react'
import {  BsSearch } from "react-icons/bs";
import { LuBriefcase } from "react-icons/lu";
import {  RiHomeSmile2Line } from 'react-icons/ri'
import { Link, useLocation } from 'react-router-dom';
import { IconType } from 'react-icons';
import { BiBell, BiChevronDown } from 'react-icons/bi';
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';









interface Page  {
  page: string;
link: string;
icon: IconType;
}

const SideBar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const pages: Page[] = [
      {
          page: "Dashboard",
          link: "graduate",
          icon: RiHomeSmile2Line
      },
      {
          page: "Messages",
          link: "messages",
          icon: HiOutlineChatBubbleLeftRight
      },
      {
          page: "Explore",
          link: "explore",
          icon: BsSearch
      },
      {
          page: "Applications",
          link: "applications",
          icon: LuBriefcase
      },
      {
          page: "Notification",
          link: "notifications",
          icon: BiBell
      },
     
  ]

  const isActive = (link: string) => {
    const linkPath = `/${link}`;
    return currentPath === linkPath || currentPath.startsWith(`${linkPath}/`);
};


  return (
    <div className='pt-[20px] max-w-[283px]  '>
      <div className='bg-[#F8F8F8]  flex flex-col justify-between w-full items-center py-[45px] px-[30px] rounded-r-[20px] border border-[#1B770033] h-[80vh]'>

        
        <div className='flex flex-col items-center gap-[40px] '>
          {
            pages.map((page) => {
              const active = isActive(page.link);
               return (
              
                <Link   key={page.link} to={`/${page.link}`} 
                className={`flex items-center text-[24px] gap-[10px] px-[10px] py-[20px] w-[218px] rounded-[20px] ${
                  active ? "bg-[#DBFFC0] text-[#1C1C1C]" : "text-[#1C1C1C80]"
                }`}
                >
                  <page.icon/>
                  <p>
                    {page.page}
                  </p>
  
                </Link>
              )
            })
          }

        </div>

        <div className='bg-[#F0F0F0] p-2.5 flex items-center justify-center gap-[5px] rounded-[10px]'>
          <img src="/profile.png" alt="profile" />
          <div>
            <p className='text-[#1C1C1C] font-semibold text-[18px]'>Abolaji Seyi</p>
            <p className='text-[#1C1C1C80] font-normal text-[14px]'>@seyiabolaji</p>
          </div>


          <BiChevronDown/>
        </div>
      </div>
    </div>
  )
}

export default SideBar