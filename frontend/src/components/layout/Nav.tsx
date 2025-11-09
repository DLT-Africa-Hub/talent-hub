import { RiHomeSmile2Line } from "react-icons/ri";
import { BsSearch } from "react-icons/bs";
import { LuBriefcase } from "react-icons/lu";
import { CiUser } from "react-icons/ci";
import { Link, useLocation } from 'react-router-dom';
import { IconType } from 'react-icons';

interface Page  {
    page: string;
  link: string;
  icon: IconType;
}

const Nav = () => {
    const location = useLocation();
    const currentPath = location.pathname;

    const pages: Page[] = [
        {
            page: "Home",
            link: "dashboard",
            icon: RiHomeSmile2Line
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
            page: "Profile",
            link: "profile",
            icon: CiUser
        },
       
    ]

    const isActive = (link: string) => {
        const linkPath = `/${link}`;
        return currentPath === linkPath || currentPath.startsWith(`${linkPath}/`);
    };

  return (
    <div className='  px-[20px] gap-[15px] fixed bottom-0 w-full border-b-[#00000033] text-[#1C1C1C] md:border-b  font-inter md:pb-[46px] md:px-[150px] bg-[#F9F9F9]'>
        <div className='flex items-center justify-between border-t border-t-[#2E5EAA33]'>
                {
                    pages.map((page) => {
                        const active = isActive(page.link);
                        return (
                            <Link 
                                key={page.link}
                                to={`/${page.link}`} 
                                className={`flex flex-col items-center justify-center text-[24px] text-center p-2.5 cursor-pointer transition-all duration-300 ease-in-out ${
                                    active
                                        ? 'text-button border-t border-button'
                                        : 'text-[#97B6E2] hover:text-button hover:border-t hover:border-button'
                                }`}
                            >
                                <page.icon/>
                                <p className='text-[16px] font-semibold'>{page.page}</p>
                            </Link>
                        );
                    })
                }
        </div>
    </div>
  )
}

export default Nav