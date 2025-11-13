import { HiOutlineChatBubbleLeftRight } from "react-icons/hi2";
import {  useLocation } from 'react-router-dom';


interface Page  {
  page: string;
link: string;
}

const MobileHeader = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const pages: Page[] = [
    {
        page: "DashBoard",
        link: "graduate",
   
    },
    {
        page: "Explore",
        link: "explore",
       
    },
    {
        page: "Applications",
        link: "applications",
      
    },
    {
        page: "Notifications",
        link: "notifications",
     
    },
   
  ];

  const getCurrentPageName = () => {

    if (currentPath === '/') {
      return "Home";
    }
    
  
    if (currentPath === '/dashboard' || currentPath.startsWith('/dashboard/')) {
      return "DashBoard";
    }
    

    const currentPage = pages.find(page => {
      const pageLinkPath = `/${page.link}`;
      return currentPath === pageLinkPath || currentPath.startsWith(`${pageLinkPath}/`);
    });
    
    return currentPage ? currentPage.page : "Home";
  };

  const currentPageName = getCurrentPageName();

  return (
    <div className='flex flex-col py-[15px] px-[20px] lg:hidden gap-[15px] sticky z-10 top-0 w-full border-b-[#00000033] text-[#1C1C1C] md:border-b md:pt-[68px] font-inter md:pb-[19px] md:px-[150px] bg-[#F9F9F9]'>
      <div className='flex items-center justify-between'>
        <p className='font-medium text-[34px]'>
          Hi, Oluwaseyi

        </p>
        <p className='text-[24px] text-button'>
        <HiOutlineChatBubbleLeftRight />
        </p>
      </div>

      <div className="w-full flex flex-col md:flex-row-reverse md:justify-between items-center ">
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

        <p className="hidden md:flex">
          {currentPageName}
        </p>
      </div>
    </div>
  )
}

export default MobileHeader