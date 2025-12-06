import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RiHomeSmile2Line } from 'react-icons/ri';
import { useAuth } from '../../context/AuthContext';
import { graduateApi } from '../../api/graduate';

const getExperienceRange = (expYears?: number): string => {
  if (!expYears) return 'N/A';
  if (expYears <= 3) return '0-3 years';
  if (expYears <= 5) return '3-5 years';
  if (expYears <= 7) return '5-7 years';
  if (expYears <= 10) return '7-10 years';
  return '10+ years';
};

const Header = () => {
  const { user } = useAuth();

  const graduateProfileQuery = useQuery({
    queryKey: ['graduateProfile', 'header'],
    queryFn: async () => {
      const profileResponse = await graduateApi.getProfile();
      return profileResponse.graduate || profileResponse;
    },
    enabled: user?.role === 'graduate',
  });

  const displayName = useMemo(() => {
    if (!user) return 'User';
    if (user.role === 'graduate') {
      const graduate = graduateProfileQuery.data;
      if (graduate) {
        const fullName =
          `${graduate.firstName || ''} ${graduate.lastName || ''}`.trim();
        return fullName || user.email?.split('@')[0] || 'User';
      }
    }
    return user.email?.split('@')[0] || 'User';
  }, [user, graduateProfileQuery.data]);

  const metrics = useMemo(() => {
    if (user?.role !== 'graduate') return null;
    const graduate = graduateProfileQuery.data;
    if (!graduate) return null;

    let rank: string | undefined;
    const rankValue = graduate.rank;
    if (rankValue) {
      const trimmedRank =
        typeof rankValue === 'string'
          ? rankValue.trim()
          : String(rankValue).trim();
      if (trimmedRank.length > 0) {
        const firstChar = trimmedRank.charAt(0).toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(firstChar)) {
          rank = firstChar;
        }
      }
    }

    const expYears = graduate.expYears;

    return {
      rank,
      experienceLevel: getExperienceRange(expYears),
    };
  }, [user?.role, graduateProfileQuery.data]);

  return (
    <div className="hidden lg:flex items-center gap-[43px] sticky z-10 top-0 w-full h-[130px] font-inter">
      <div className="p-[50px] flex items-center justify-center gap-[5px] text-[24px] font-medium text-[#1C1C1C] border border-fade rounded-br-[20px] bg-[#F8F8F8]">
        <RiHomeSmile2Line className="text-button" />
        <p>Talent Match</p>
      </div>
      <div className="flex items-center justify-between px-[30px] py-[50px] bg-[#F8F8F8]  h-full grow border border-fade  rounded-bl-[20px]">
        <p className="font-medium text-[22px] text-[#1c1c1c]">{displayName}</p>

        {user?.role === 'graduate' && metrics && (
          <div className="flex w-full md:w-auto items-center  flex-wrap gap-5 ">
            {metrics.rank && (
              <div className="flex items-center justify-center rounded-[10px] border border-fade py-[15px] px-[26.5px] gap-[10px]">
                <p className="font-medium text-[24px] text-[#F8F8F8] w-[50px] h-[50px] rounded-[10px] bg-button flex items-center justify-center">
                  {metrics.rank}
                </p>

                <div className="flex flex-col text-center">
                  <p className="text-[#1C1C1CBF] font-normal text-[16px]">
                    Your Rank
                  </p>
                  <p className="text-[#1C1C1CE5] font-bold  text-[20px]">
                    {metrics.rank} Rank
                  </p>
                </div>
              </div>
            )}
            {metrics.experienceLevel && (
              <div className="flex items-center justify-center rounded-[10px] border border-fade py-[15px] px-[26.5px] gap-[10px]">
                <div className="flex flex-col text-center">
                  <p className="text-[#1C1C1CBF] font-normal text-[16px]">
                    Experience Level
                  </p>
                  <p className="text-[#1C1C1CE5] font-bold  text-[20px]">
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

export default Header;
