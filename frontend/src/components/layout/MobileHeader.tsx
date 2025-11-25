import { HiOutlineChatBubbleLeftRight } from "react-icons/hi2";
import { Link, useLocation } from 'react-router-dom';
import { BiBell } from "react-icons/bi";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../hooks/useNotifications";
import { useQuery } from '@tanstack/react-query';
import { companyApi } from "../../api/company";
import { graduateApi } from "../../api/graduate";

interface Page  {
  page: string;
  link: string;
}

const getExperienceRange = (expYears?: number): string | undefined => {
  if (expYears === undefined || expYears < 3) return undefined;
  if (expYears <= 4) return '3-4 years';
  if (expYears <= 6) return '5-6 years';
  if (expYears <= 8) return '7-8 years';
  if (expYears <= 10) return '9-10 years';
  return '10+ years';
};

const MobileHeader = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const pages: Page[] = [
    { page: "DashBoard", link: "graduate" },
    { page: "Candidates", link: "candidates" },
    { page: "Jobs", link: "jobs" },
    { page: "Explore", link: "explore" },
    { page: "Applications", link: "applications" },
    { page: "Notifications", link: "notifications" },
  ];

  // Fetch profiles
  const companyProfileQuery = useQuery({
    queryKey: ['companyProfile'],
    queryFn: () => companyApi.getProfile(),
    enabled: user?.role === 'company',
  });

  const graduateProfileQuery = useQuery({
    queryKey: ['graduateProfile', 'header'],
    queryFn: async () => {
      const profileResponse = await graduateApi.getProfile();
      return profileResponse.graduate || profileResponse;
    },
    enabled: user?.role === 'graduate',
  });

  // Compute displayName
  const displayName = (() => {
    if (!user) return 'User';
    if (user.role === 'company') {
      return companyProfileQuery.data?.companyName || user.email?.split('@')[0] || 'User';
    }
    if (user.role === 'graduate') {
      const graduate = graduateProfileQuery.data;
      if (graduate) {
        const fullName = `${graduate.firstName || ''} ${graduate.lastName || ''}`.trim();
        return fullName || user.email?.split('@')[0] || 'User';
      }
    }
    return user.email?.split('@')[0] || 'User';
  })();

  // Compute metrics (graduate rank & experience)
  const metrics = (() => {
    if (user?.role !== 'graduate') return null;
    const graduate = graduateProfileQuery.data;
    if (!graduate) return null;

    // Rank logic
    let rank: string | undefined;
    const rankValue = graduate.rank;
    if (rankValue) {
      const trimmedRank =
        typeof rankValue === 'string' ? rankValue.trim() : String(rankValue).trim();
      if (trimmedRank.length > 0) {
        const firstChar = trimmedRank.charAt(0).toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(firstChar)) rank = firstChar;
      }
    }

    const expYears = graduate.expYears;

    return {
      rank,
      experienceLevel: getExperienceRange(expYears),
    };
  })();

  const getCurrentPageName = () => {
    if (currentPath === '/') return "Home";
    if (currentPath === '/dashboard' || currentPath.startsWith('/dashboard/')) return "DashBoard";

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
          Hi, {displayName}
        </p>
        <div className="flex gap-1 items-center">
          <p className='text-[24px] text-button'>
            <HiOutlineChatBubbleLeftRight />
          </p>
          <Link to="/notifications" className="relative text-button text-[24px] ">
            <BiBell/>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Graduate metrics */}
      {user?.role === 'graduate' && metrics && (
        <div className="flex w-full md:w-auto items-center flex-wrap gap-5">
          {metrics.rank && (
            <div className="flex items-center justify-center rounded-[10px] border border-fade py-[15px] px-[26.5px] gap-[10px]">
              <p className="font-medium text-[24px] text-[#F8F8F8] w-[50px] h-[50px] rounded-[10px] bg-button flex items-center justify-center">{metrics.rank}</p>
              <div className="flex flex-col text-center">
                <p className="text-[#1C1C1CBF] font-normal text-[16px]">Your Rank</p>
                <p className="text-[#1C1C1CE5] font-bold text-[20px]">{metrics.rank} Rank</p>
              </div>
            </div>
          )}

          {metrics.experienceLevel && (
            <div className="flex items-center justify-center rounded-[10px] border border-fade py-[15px] px-[26.5px] gap-[10px]">
              <div className="flex flex-col text-center">
                <p className="text-[#1C1C1CBF] font-normal text-[16px]">Experience Level</p>
                <p className="text-[#1C1C1CE5] font-bold text-[20px]">{metrics.experienceLevel}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="hidden md:flex">{currentPageName}</p>
    </div>
  )
}

export default MobileHeader;
