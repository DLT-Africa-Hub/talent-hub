import { useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { RiHomeSmile2Line } from 'react-icons/ri';
import { useAuth } from '../../context/AuthContext';
import { companyApi } from '../../api/company';
import { graduateApi } from '../../api/graduate';

interface HeaderMetrics {
  rank?: string;
  experienceLevel?: string;
}

const getExperienceRange = (expYears?: number): string | undefined => {
  if (expYears === undefined || expYears < 3) return undefined;

  if (expYears <= 4) return '3-4 years';
  if (expYears <= 6) return '5-6 years';
  if (expYears <= 8) return '7-8 years';
  if (expYears <= 10) return '9-10 years';
  return '10+ years';
};

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
    queryKey: ['graduateProfile', 'header'],
    queryFn: async () => {
      const profileResponse = await graduateApi.getProfile();
      return profileResponse.graduate || profileResponse;
    },
    enabled: user?.role === 'graduate',
  });

  const companyStatsQueries = useQueries({
    queries: [
      {
        queryKey: ['companyJobs', { status: 'active' }],
        queryFn: async () => {
          const response = await companyApi.getJobs({
            page: 1,
            limit: 1,
            status: 'active',
          });
          return response;
        },
        enabled: user?.role === 'company',
        staleTime: 60 * 1000,
      },
      {
        queryKey: ['companyApplications'],
        queryFn: async () => {
          const response = await companyApi.getApplications({
            page: 1,
            limit: 1,
          });
          return response;
        },
        enabled: user?.role === 'company',
        staleTime: 60 * 1000,
      },
      {
        queryKey: ['companyApplications', { status: 'accepted' }],
        queryFn: async () => {
          const response = await companyApi.getApplications({
            page: 1,
            limit: 1,
            status: 'accepted',
          });
          return response;
        },
        enabled: user?.role === 'company',
        staleTime: 60 * 1000,
      },
    ],
  });

  const [companyJobsQuery, companyApplicationsQuery, companyHiredQuery] =
    companyStatsQueries;

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

    // Extract rank - handle formats like "A", "A and B", "B and C", etc.
    let rank: string | undefined;
    const rankValue = graduate.rank;

    if (rankValue) {
      // Handle string rank values
      const trimmedRank =
        typeof rankValue === 'string'
          ? rankValue.trim()
          : String(rankValue).trim();
      if (trimmedRank && trimmedRank.length > 0) {
        // Take the first character if it's a single letter, or the first letter if it's "A and B" format
        const firstChar = trimmedRank.charAt(0).toUpperCase();
        // Only use if it's a valid rank letter (A, B, C, D)
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

  const companyStats = useMemo(() => {
    if (user?.role !== 'company') return null;

    const offered = companyJobsQuery?.data?.pagination?.total || 0;
    const applicants = companyApplicationsQuery?.data?.pagination?.total || 0;
    const hired = companyHiredQuery?.data?.pagination?.total || 0;

    return { offered, applicants, hired };
  }, [
    user?.role,
    companyJobsQuery?.data,
    companyApplicationsQuery?.data,
    companyHiredQuery?.data,
  ]);

  const companyStatsLoading =
    user?.role === 'company' &&
    (companyJobsQuery?.isLoading ||
      companyApplicationsQuery?.isLoading ||
      companyHiredQuery?.isLoading);

  const loading =
    (user?.role === 'company' &&
      (companyProfileQuery.isLoading || companyStatsLoading)) ||
    (user?.role === 'graduate' && graduateProfileQuery.isLoading);

  return (
    <div className="hidden lg:flex items-center gap-[32px] sticky z-10 top-0 w-full h-[100px] font-inter">
      <div className="p-[30px] h-full flex items-center justify-center gap-[6px] text-[18px] font-medium text-[#1C1C1C] border border-fade rounded-br-[16px] bg-[#F8F8F8] w-[240px]">
        <RiHomeSmile2Line className="text-button text-[22px]" />
        <p>Talent Match</p>
      </div>

      <div className="flex items-center justify-between px-[24px] py-[32px] bg-[#F8F8F8] h-full grow border border-fade rounded-bl-[16px]">
        {!loading && (
          <p className="font-semibold text-[18px] text-[#1c1c1c]">
            Hi, {displayName}
          </p>
        )}

        {user?.role === 'graduate' && !loading && graduateProfileQuery.data && (
          <div className="flex items-center gap-[12px]">
            {metrics.rank && (
              <div className="flex items-center justify-center rounded-[10px] border border-fade py-[12px] px-[20px] gap-[10px] bg-white">
                <div className="font-semibold text-[18px] text-[#F8F8F8] w-[40px] h-[40px] rounded-[8px] bg-button flex items-center justify-center">
                  {metrics.rank}
                </div>
                <div className="flex flex-col items-center justify-center">
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
                <div className="flex flex-col items-center justify-center">
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

        {user?.role === 'company' && companyStats && !companyStatsLoading && (
          <div className="flex items-center gap-[12px]">
            <CompanyStatCard label="Offered" value={companyStats.offered} />
            <CompanyStatCard
              label="Applicants"
              value={companyStats.applicants}
            />
            <CompanyStatCard label="Hired" value={companyStats.hired} />
          </div>
        )}
      </div>
    </div>
  );
};

const CompanyStatCard = ({
  label,
  value,
}: {
  label: string;
  value: number;
}) => (
  <div className="flex items-center justify-center rounded-[10px] border border-fade py-[12px] px-[20px] gap-[10px] w-[180px]">
    <div className="flex flex-col text-center">
      <p className="text-[#1C1C1CBF] font-normal text-[12px]">{label}</p>
      <p className="text-[#1C1C1CE5] font-bold text-[16px]">{value}+</p>
    </div>
  </div>
);

export default DashboardHeader;
