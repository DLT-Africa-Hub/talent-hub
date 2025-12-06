import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '../../index';
import StatsButton from '../../components/admin/dashboard/stats-button';
import { IconType } from 'react-icons';
import { FaBriefcase, FaBuilding, FaUserPlus, FaUsers } from 'react-icons/fa6';
import { FiTrendingUp } from 'react-icons/fi';
import { AiOutlineRobot } from 'react-icons/ai';
import { MdPendingActions } from 'react-icons/md';
import { GiBrain } from 'react-icons/gi';
import ActivityItem from '../../components/admin/dashboard/activity-list';
import HiringCompany from '../../components/admin/dashboard/hiring-company';
import adminApi from '@/api/admin';
import { formatDistanceToNow } from 'date-fns';

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

const hiringCompanies = [
  {
    name: "Care Chain",
    jobs: 45,
    hired: 30,
  },
  {
    name: "DLT Africa",
    jobs: 45,
    hired: 30,
  },
  {
    name: "Enterprise Corp",
    jobs: 45,
    hired: 30,
  },
  {
    name: "Tech Innovations Inc",
    jobs: 45,
    hired: 30,
  },
  {
    name: "DLT Hub",
    jobs: 45,
    hired: 30,
  },
];

const AdminDashboard = () => {
  // Fetch talent count
  const { data: talentData, isLoading: talentLoading } = useQuery({
    queryKey: ['talentCount'],
    queryFn: adminApi.getTalentCount,
  });

  // Fetch company count
  const { data: companyData, isLoading: companyLoading } = useQuery({
    queryKey: ['companyCount'],
    queryFn: adminApi.getCompanyCount,
  });

  // Fetch active jobs count
  const { data: activeJobsData, isLoading: activeJobsLoading } = useQuery({
    queryKey: ['activeJobsCount'],
    queryFn: adminApi.getActiveJobsCount,
  });

  // Fetch user activity logs
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['userActivityLogs'],
    queryFn: adminApi.getUserActivityLogs,
  });

  const isLoading = talentLoading || companyLoading || activeJobsLoading || activityLoading;

  // Build stats array with real data
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
      numbers: '20,000+',
      analysis: '+12% vs last month',
      icon: FaBriefcase,
    },
    {
      title: 'Active Job Listings',
      numbers: activeJobsData?.data?.total?.toLocaleString() || '0',
      analysis: '+12% vs last month',
      icon: FiTrendingUp,
    },
    {
      title: 'New SignUps',
      numbers: '234',
      analysis: '+12% vs last month',
      icon: FaUserPlus,
    },
    {
      title: 'AI Match Rate',
      numbers: '87%',
      analysis: '+12% vs last month',
      icon: AiOutlineRobot,
    },
    {
      title: 'Pending Approvals',
      numbers: '18',
      analysis: 'Needs review',
      icon: MdPendingActions,
    },
    {
      title: 'AI Assessment',
      numbers: '3,450',
      analysis: '+12% vs last month',
      icon: GiBrain,
    },
  ];

  // Process activity logs
  const activities = activityData?.data?.map((log: ActivityLog) => ({
    activity: log.summary,
    time: formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }),
    metadata: log.metadata,
    type:log.type,
    action:log.action
  })) || [];

  if (isLoading) {
    return (
      <div className="max-w-[1200px] my-0 mx-auto p-8 ">
        <LoadingSpinner message="Loading dashboard..." fullPage />
      </div>
    );
  }

  return (
    <div className="py-[20px] px-[20px]  lg:px-0 lg:pr-[20px] flex flex-col gap-[43px] font-inter items-start overflow-y-auto h-full">
      <p className="text-[#1C1C1C] font-semibold text-[26px]">Dashboard</p>

      <div className="flex flex-wrap gap-[61px] justify-between">
        {stats.map((stat) => (
          <StatsButton
            title={stat.title}
            analysis={stat.analysis}
            numbers={stat.numbers}
            icon={stat.icon}
            key={stat.title}
          />
        ))}
      </div>

      <div className='grid grid-cols-1 gap-5 lg:grid-cols-2  w-full'>
        <div className="flex flex-col rounded-[10px] border border-fade w-full gap-[21px]  max-w-[715px] p-[23px] max-h-[451px]  bg-white">
          <p className="text-[#1C1C1C] font-semibold text-[20px]">Recent Activities</p>
          <div className='flex flex-col gap-[25px] overflow-y-scroll'>
              {activities.length > 0 ? (
                activities.map((activity: any, index: number) => (
                  <ActivityItem 
                    activity={activity.activity} 
                    time={activity.time} 
                    key={`${activity.activity}-${index}`}
                    metadata={activity.metadata}
                    type={activity.type}
                    action={activity.action}
                  />
                ))
              ) : (
                <p className="text-[#1C1C1CBF] text-center py-4">No recent activities</p>
              )}
          </div>
        </div>

        <div className="flex flex-col rounded-[10px] border border-fade w-full gap-[21px] max-h-[451px]  max-w-[715px] p-[23px] bg-white">
        <p className="text-[#1C1C1C] font-semibold text-[20px]">Top Hiring Companies</p> 
        <div className='flex flex-col gap-[25px] overflow-y-scroll'>
              {hiringCompanies.map((company) => (
                <HiringCompany hired={company.hired} jobs={company.jobs} name={company.name} key={company.name}/>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;