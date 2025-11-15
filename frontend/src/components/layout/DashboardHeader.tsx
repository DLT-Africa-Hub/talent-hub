import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RiHomeSmile2Line } from 'react-icons/ri';
import { useAuth } from '../../context/AuthContext';
import { companyApi } from '../../api/company';
import { graduateApi } from '../../api/graduate';

interface HeaderMetrics {
  rank?: string;
  rankScore?: number;
  experienceLevel?: string;
}

const DashboardHeader = () => {
  const { user } = useAuth();

  const companyProfileQuery = useQuery({
    queryKey: ['companyProfile'],
    queryFn: async () => {
      const profile = await companyApi.getProfile();
      return profile;
    },
    enabled: user?.role === 'company',
  });

  const graduateProfileQuery = useQuery({
    queryKey: ['graduateProfile'],
    queryFn: async () => {
      const profileResponse = await graduateApi.getProfile();
      return profileResponse.graduate || profileResponse;
    },
    enabled: user?.role === 'graduate',
  });

  const calculateExperienceLevel = useCallback((expYears: number): string => {
    if (expYears < 2) return 'Entry level';
    if (expYears < 5) return '2-4 years';
    if (expYears < 8) return '5-7 years';
    return '8+ years';
  }, []);

  const displayName = useMemo(() => {
    if (!user) return 'User';

    if (user.role === 'company') {
      return (
        companyProfileQuery.data?.companyName ||
        user.email?.split('@')[0] ||
        'User'
      );
    }

    if (user.role === 'graduate') {
      const graduate = graduateProfileQuery.data;
      if (graduate) {
        const fullName =
          `${graduate.firstName || ''} ${graduate.lastName || ''}`.trim();
        return fullName || user.email?.split('@')[0] || 'User';
      }
    }

    return user.email?.split('@')[0] || 'User';
  }, [user, companyProfileQuery.data, graduateProfileQuery.data]);

  const metrics = useMemo<HeaderMetrics>(() => {
    if (user?.role !== 'graduate') return {};

    const graduate = graduateProfileQuery.data;
    if (!graduate) return {};

    const result: HeaderMetrics = {};

    if (graduate.rank) {
      result.rank = graduate.rank.charAt(0).toUpperCase() || 'C';
    }

    const expYears = graduate.expYears || 0;
    result.experienceLevel = calculateExperienceLevel(expYears);

    return result;
  }, [user?.role, graduateProfileQuery.data, calculateExperienceLevel]);

  const loading =
    (user?.role === 'company' && companyProfileQuery.isLoading) ||
    (user?.role === 'graduate' && graduateProfileQuery.isLoading);

  return (
    <div className="hidden lg:flex items-center gap-[32px] sticky z-10 top-0 w-full h-[100px] font-inter">
      <div className="p-[32px] flex items-center justify-center gap-[6px] text-[20px] font-semibold text-[#1C1C1C] border border-fade rounded-br-[16px] bg-[#F8F8F8]">
        <RiHomeSmile2Line className="text-button text-[22px]" />
        <p>Talent Match</p>
      </div>

      <div className="flex items-center justify-between px-[24px] py-[32px] bg-[#F8F8F8] h-full grow border border-fade rounded-bl-[16px]">
        {!loading && (
          <p className="font-semibold text-[18px] text-[#1c1c1c]">
            Hi, {displayName}
          </p>
        )}

        {user?.role === 'graduate' && metrics.rank && (
          <div className="flex items-center gap-[12px]">
            {metrics.rank && (
              <div className="flex items-center justify-center rounded-[10px] border border-fade py-[12px] px-[20px] gap-[10px] bg-white">
                <div className="font-semibold text-[18px] text-[#F8F8F8] w-[40px] h-[40px] rounded-[8px] bg-button flex items-center justify-center">
                  {metrics.rank}
                </div>
                <div className="flex flex-col">
                  <p className="text-[#1C1C1CBF] font-normal text-[12px]">
                    Your Rank
                  </p>
                  <p className="text-[#1C1C1CE5] font-bold text-[16px]">
                    {metrics.rank} Rank
                  </p>
                </div>
              </div>
            )}
            {metrics.experienceLevel && (
              <div className="flex items-center justify-center rounded-[10px] border border-fade py-[12px] px-[20px] gap-[10px] bg-white">
                <div className="flex flex-col">
                  <p className="text-[#1C1C1CBF] font-normal text-[12px]">
                    Experience Level
                  </p>
                  <p className="text-[#1C1C1CE5] font-bold text-[16px]">
                    {metrics.experienceLevel}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHeader;
