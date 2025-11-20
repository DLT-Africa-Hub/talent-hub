import { RiHomeSmile2Line } from "react-icons/ri";
import { BsSearch } from "react-icons/bs";
import { LuBriefcase } from "react-icons/lu";
import { Link, useLocation } from 'react-router-dom';
import { IconType } from 'react-icons';
import { BiBell } from "react-icons/bi";
import { useAuth } from "../../context/AuthContext";
import { PiUsersThreeLight } from "react-icons/pi";
import { useNotifications } from "../../hooks/useNotifications";




interface Page  {
    page: string;
    link: string;
    icon: IconType;
}



const MobileNav = () => {
    const location = useLocation();
    const currentPath = location.pathname;

    const {user} = useAuth();
    const { unreadCount } = useNotifications();

    const dashboardLink = user?.role === "company" ? "company" : "graduate";

  
    const allPages: Page[] = [
        { page: "Dashboard", link: dashboardLink, icon: RiHomeSmile2Line },
        { page: "Candidates", link: "candidates", icon: PiUsersThreeLight },
        { page: "Explore", link: "explore", icon: BsSearch },
        { page: "Applications", link: "applications", icon: LuBriefcase },
        { page: "Notifications", link: "notifications", icon: BiBell },
        { page: 'Jobs', link: 'jobs', icon: LuBriefcase },
    ];

 
    const rolePagesMap: Record<string, string[]> = {
        company: [dashboardLink, "candidates", "explore", "jobs"],
        graduate: ["graduate", "explore", "applications"],
    };

    const allowed = rolePagesMap[user?.role] || rolePagesMap["graduate"];
    const pages = allPages.filter(p => allowed.includes(p.link));

    const isActive = (link: string) => {
        const linkPath = `/${link}`;
        return currentPath === linkPath || currentPath.startsWith(`${linkPath}/`);
    };

    return (
        <div className='px-[20px] gap-[15px] fixed z-10 bottom-0 w-full border-b-[#00000033] text-[#1C1C1C] md:border-b font-inter lg:hidden bg-[#F9F9F9]'>
            <div className='flex items-center justify-between border-t border-t-[#2E5EAA33]'>
                {pages.map((page) => {
                    const active = isActive(page.link);
                    const showNotificationBadge = page.link === 'notifications' && unreadCount > 0;
                    return (
                        <Link
                            key={page.link}
                            to={`/${page.link}`}
                            className={`relative flex flex-col items-center justify-center text-[24px] text-center p-2.5 cursor-pointer transition-all duration-300 ease-in-out ${
                                active
                                    ? 'text-button border-t border-button'
                                    : 'text-fade hover:text-button hover:border-t hover:border-button'
                            }`}
                        >
                            <page.icon />
                            {showNotificationBadge && (
                              <span className="absolute top-1 right-1/2 translate-x-1/2 flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-semibold">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                            <p className='text-[14px] font-semibold'>{page.page}</p>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileNav;
