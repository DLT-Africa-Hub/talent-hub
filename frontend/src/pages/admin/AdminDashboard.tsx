import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '../../index';
import StatsButton from '../../components/admin/dashboard/stats-button';
import { IconType } from 'react-icons';
import { FaBriefcase, FaBuilding, FaUserPlus, FaUsers } from 'react-icons/fa6';
import ActivityItem, {
  ActivityItemProps,
} from '../../components/admin/dashboard/activity-list';
import HiringCompany from '../../components/admin/dashboard/hiring-company';
import adminApi from '@/api/admin';
import { formatDistanceToNow } from 'date-fns';
import { PiListChecksFill } from 'react-icons/pi';

export interface CompanyStatsApi {
  _id: string;
  companyName: string;
  postedJobs: number;
  hiredCandidates?: string[]; 
}

export interface HiringCompanyStats {
  name: string;
  jobs: number;
  hired: number;
}

export interface StatCard {
  title: string;
  numbers: string;
  analysis: string;
  icon: IconType;
}

interface ActivityLog {
  type: string;
  action: string;
  timestamp: string;
  summary: string;
  metadata: Record<string, any>;
}

const AdminDashboard = () => {
  // Stats queries
  const { data: talentData, isLoading: talentLoading } = useQuery({
    queryKey: ['talentCount'],
    queryFn: adminApi.getTalentCount,
  });

  const { data: companyData, isLoading: companyLoading } = useQuery({
    queryKey: ['companyCount'],
    queryFn: adminApi.getCompanyCount,
  });
  const { data: totalPostedJobs, isLoading: postedJobsLoading } = useQuery({
    queryKey: ['totalJobCount'],
    queryFn: adminApi.getTotalPostedJobs,
  });

  const { data: activeJobsData, isLoading: activeJobsLoading } = useQuery({
    queryKey: ['activeJobsCount'],
    queryFn: adminApi.getActiveJobsCount,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['userActivityLogs'],
    queryFn: () => adminApi.getUserActivityLogs(),
  });

  // ✅ Top hiring companies
  const { data: companiesStatsData, isLoading: companiesStatsLoading } =
    useQuery({
      queryKey: ['companiesStats', { page: 1, limit: 5 }],
      queryFn: () => adminApi.getCompaniesStats({ page: 1, limit: 5 }),
    });

  const isLoading =
    postedJobsLoading ||
    talentLoading ||
    companyLoading ||
    activeJobsLoading ||
    activityLoading ||
    companiesStatsLoading;

  console.log(totalPostedJobs);

  // Stats cards
  const stats: StatCard[] = [
    {
      title: 'Total Companies',
      numbers: companyData?.data?.total?.toLocaleString() || '0',
      analysis: '+12% vs last month',
      icon: FaBuilding,
    },
    {
      title: 'Total Talents',
      numbers: talentData?.data?.total?.toLocaleString() || '0',
      analysis: '-12% vs last month',
      icon: FaUsers,
    },
    {
      title: 'Total Jobs Posted',
      numbers: totalPostedJobs?.data?.total?.toLocaleString() || '0',
      analysis: 'All time',
      icon: FaBriefcase,
    },
    {
      title: 'Active Job Listings',
      numbers: activeJobsData?.data?.total?.toLocaleString() || '0',
      analysis: '+12% vs last month',
      icon: PiListChecksFill,
    },
    {
      title: 'New SignUps',
      numbers: '—',
      analysis: 'This week',
      icon: FaUserPlus,
    },
  ];

  // Activity logs
  const activities =
    activityData?.data?.map((log: ActivityLog) => ({
      activity: log.summary,
      time: formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }),
      metadata: log.metadata,
      type: log.type,
      action: log.action,
    })) || [];

  const hiringCompanies: HiringCompanyStats[] =
    (companiesStatsData?.data as CompanyStatsApi[] | undefined)
      ?.map((company) => ({
        name: company.companyName || 'Unnamed Company',
        jobs: company.postedJobs ?? 0,
        hired: company.hiredCandidates?.length ?? 0,
      }))
      ?.sort((a, b) => {
        if (b.jobs !== a.jobs) {
          return b.jobs - a.jobs;
        }

        return b.hired - a.hired;
      }) || [];

  console.log(companiesStatsData);

  if (isLoading) {
    return (
      <div className="max-w-[1200px] my-0 mx-auto p-8">
        <LoadingSpinner message="Loading dashboard..." fullPage />
      </div>
    );
  }

  return (
    <div className="py-[20px] px-[20px] pb-[100px] lg:px-0 lg:pr-[20px] flex flex-col gap-[43px] font-inter items-start overflow-y-auto h-full">
      <p className="text-[#1C1C1C] font-semibold text-[26px]">Dashboard</p>

      {/* Stats cards */}
      <div className="flex flex-wrap gap-[61px] justify-between">
        {stats.map((stat) => (
          <StatsButton
            key={stat.title}
            title={stat.title}
            analysis={stat.analysis}
            numbers={stat.numbers}
            icon={stat.icon}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 w-full">
        {/* Recent Activities */}
        <div className="flex flex-col rounded-[10px] border border-fade w-full gap-[21px] max-h-[451px] p-[23px] bg-white">
          <p className="text-[#1C1C1C] font-semibold text-[20px]">
            Recent Activities
          </p>

          <div className="flex flex-col gap-[25px] overflow-y-scroll">
            {activities.length > 0 ? (
              activities.map((activity: ActivityItemProps, index: number) => (
                <ActivityItem
                  key={index}
                  activity={activity.activity}
                  time={activity.time}
                  metadata={activity.metadata}
                  type={activity.type}
                  action={activity.action}
                />
              ))
            ) : (
              <p className="text-[#1C1C1CBF] text-center py-4">
                No recent activities
              </p>
            )}
          </div>
        </div>

        {/* ✅ Top Hiring Companies */}
        <div className="flex flex-col rounded-[10px] border border-fade w-full gap-[21px] max-h-[451px] p-[23px] bg-white">
          <p className="text-[#1C1C1C] font-semibold text-[20px]">
            Top Hiring Companies
          </p>

          <div className="flex flex-col gap-[25px] overflow-y-scroll">
            {}
            {hiringCompanies.length > 0 ? (
              hiringCompanies.map((company) => (
                <HiringCompany
                  key={company.name}
                  name={company.name}
                  jobs={company.jobs}
                  hired={company.hired}
                />
              ))
            ) : (
              <p className="text-[#1C1C1CBF] text-center py-4">
                No hiring companies yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
