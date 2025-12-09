import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BsSearch } from 'react-icons/bs';
import { LuBriefcase } from 'react-icons/lu';
import { RiHomeSmile2Line } from 'react-icons/ri';
import { IconType } from 'react-icons';
import { BiBell, BiChevronDown, BiLogOut, BiUser } from 'react-icons/bi';
import { HiOutlineChatBubbleLeftRight, HiOutlineUsers } from 'react-icons/hi2';
import { HiVideoCamera } from 'react-icons/hi';
import { PiBuildingApartmentLight, PiUsersThreeLight } from 'react-icons/pi';
import { useAuth } from '../../context/AuthContext';
import { companyApi } from '../../api/company';
import { messageApi } from '../../api/message';
import { useNotifications } from '../../hooks/useNotifications';
import { GoGear } from 'react-icons/go';

interface Page {
  page: string;
  link: string;
  icon: IconType;
}

const pagesByRole: Record<string, Page[]> = {
  company: [
    { page: 'Dashboard', link: 'company', icon: RiHomeSmile2Line },
    { page: 'Candidates', link: 'candidates', icon: PiUsersThreeLight },
    { page: 'Messages', link: 'messages', icon: HiOutlineChatBubbleLeftRight },
    { page: 'Explore', link: 'company/explore', icon: BsSearch },
    { page: 'Interviews', link: 'interviews', icon: HiVideoCamera },
    { page: 'Jobs', link: 'jobs', icon: LuBriefcase },
    { page: 'Notification', link: 'notifications', icon: BiBell },
  ],

  graduate: [
    { page: 'Dashboard', link: 'graduate', icon: RiHomeSmile2Line },
    { page: 'Messages', link: 'messages', icon: HiOutlineChatBubbleLeftRight },
    { page: 'Interviews', link: 'interviews', icon: HiVideoCamera },
    { page: 'Explore', link: 'explore', icon: BsSearch },
    { page: 'Applications', link: 'applications', icon: LuBriefcase },
    { page: 'Notification', link: 'notifications', icon: BiBell },
  ],

  admin: [
    { page: 'Dashboard', link: 'admin', icon: RiHomeSmile2Line },
    {
      page: 'Companies',
      link: 'admin/companies',
      icon: PiBuildingApartmentLight,
    },
    { page: 'Talents', link: 'admin/talents', icon: HiOutlineUsers },
    { page: 'Jobs', link: 'admin/jobs', icon: LuBriefcase },
    { page: 'Interviews', link: 'interviews', icon: HiVideoCamera },
    { page: 'Messages', link: 'messages', icon: HiOutlineChatBubbleLeftRight },
    // { page: 'App Status', link: 'app-status', icon: FaArrowTrendUp },
    { page: 'Notifications', link: 'notifications', icon: BiBell },
    { page: 'Settings', link: 'admin/settings', icon: GoGear },
  ],
};

const SideBar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const role = user?.role ?? 'graduate';
  const pages = pagesByRole[role] ?? pagesByRole['graduate'];

  const normalizePath = (p: string) => (p.startsWith('/') ? p : `/${p}`);

  const username = user?.email?.split('@')[0] || 'user';
  const displayName = user?.email?.split('@')[0] || 'User';

  const jobsQuery = useQuery({
    queryKey: ['companyJobs', { status: 'active' }],
    queryFn: async () => {
      const response = await companyApi.getJobs({ page: 1, limit: 1 });
      return response;
    },
    enabled: role === 'company',
  });

  const { unreadCount: notificationCount } = useNotifications();

  const messagesQuery = useQuery({
    queryKey: ['messageUnreadCount'],
    queryFn: async () => {
      const response = await messageApi.getUnreadCount();
      return response.count || 0;
    },
  });

  const jobCount = useMemo(() => {
    if (role !== 'company' || !jobsQuery.data) return null;
    return jobsQuery.data.pagination?.total || 0;
  }, [role, jobsQuery.data]);

  const messageCount = useMemo(() => {
    return messagesQuery.data || 0;
  }, [messagesQuery.data]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsDropdownOpen(false);
  };

  return (
    <div className="pt-[16px] max-w-[240px]">
      <div className="bg-[#F8F8F8] flex flex-col justify-between w-full gap-[32px] items-center py-[32px] px-[24px] rounded-r-[16px] border border-fade min-h-[80vh]">
        <div className="flex flex-col items-center gap-[24px] w-full">
          {pages.map((page) => {
            const to = normalizePath(page.link);
            const showJobCount =
              page.link === 'jobs' && role === 'company' && jobCount !== null;
            const showNotificationCount =
              page.link === 'notifications' && notificationCount > 0;
            const showMessageCount =
              page.link === 'messages' && messageCount > 0;

            const badgeCount = showJobCount
              ? jobCount
              : showNotificationCount
                ? notificationCount
                : showMessageCount
                  ? messageCount
                  : null;

            const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
              const currentPath = window.location.pathname;
              if (currentPath !== to && !currentPath.startsWith(to + '/')) {
                e.preventDefault();
                navigate(to);
              }
            };

            // Determine if this link should use exact matching
            const shouldUseExactMatch =
              page.link === 'graduate' ||
              page.link === 'company' ||
              page.link === 'admin';

            return (
              <NavLink
                key={page.link}
                to={to}
                end={shouldUseExactMatch}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center justify-between text-[18px] gap-[10px] px-[12px] py-[12px] w-full rounded-[12px] transition-colors ${
                    isActive
                      ? 'bg-[#DBFFC0] text-[#1C1C1C]'
                      : 'text-[#1C1C1C80] hover:bg-[#F0F0F0]'
                  }`
                }
              >
                <div className="flex items-center gap-[10px]">
                  <page.icon className="text-[20px]" />
                  <p className="font-medium">{page.page}</p>
                </div>
                {badgeCount !== null && (
                  <span className="flex items-center justify-center min-w-[24px] h-[24px] px-[8px] rounded-full bg-button text-white text-[12px] font-semibold">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        <div className="relative w-full" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="bg-[#F0F0F0] p-[10px] flex items-center justify-center gap-[8px] rounded-[10px] w-full hover:bg-[#E8E8E8] transition-colors"
          >
            <div className="w-[40px] h-[40px] rounded-[8px] bg-linear-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-semibold text-[16px] shadow-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[#1C1C1C] font-semibold text-[14px] truncate">
                {displayName}
              </p>
              <p className="text-[#1C1C1C80] font-normal text-[12px] truncate">
                @{username}
              </p>
            </div>
            <BiChevronDown
              className={`text-[18px] text-[#1C1C1C80] transition-transform ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute bottom-full left-0 mb-[8px] w-full bg-white rounded-[12px] border border-fade shadow-lg overflow-hidden z-50">
              <button
                onClick={() => {
                  const basePath =
                    user?.role === 'company' ? '/company' : '/graduate';
                  setIsDropdownOpen(false);
                  navigate(`${basePath}/profile`);
                }}
                className="w-full flex items-center gap-[10px] px-[16px] py-[12px] text-[#1C1C1C] hover:bg-[#F8F8F8] transition-colors text-[14px] font-medium"
              >
                <BiUser className="text-[18px]" />
                <span>View Profile</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-[10px] px-[16px] py-[12px] text-[#DC2626] hover:bg-[#FEF2F2] transition-colors text-[14px] font-medium"
              >
                <BiLogOut className="text-[18px]" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SideBar;
