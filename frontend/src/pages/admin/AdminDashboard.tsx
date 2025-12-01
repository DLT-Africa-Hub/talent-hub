import { useState, useEffect } from 'react';
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

export interface StatCard {
  title: string;
  numbers: string;
  analysis: string;
  icon: IconType; // React icon component
}

const stats: StatCard[] = [
  {
    title: 'Total Companies',
    numbers: '400',
    analysis: '+12% vs last month',
    icon: FaBuilding,
  },
  {
    title: 'Total Candidates',
    numbers: '5,000+',
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
    numbers: '1,250',
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

const activities = [
  {
    activity: "New candidate Sarah Johnson completed AI assessment",
    time: "2 minutes ago",
  },
  {
    activity: "Company Tech Innovations Inc posted 3 new jobs",
    time: "2 minutes ago",
  },
  {
    activity: "Pending approval required for StartUp Dreams Co",
    time: "2 minutes ago",
  },
  {
    activity: "AI matching completed for 45 job-candidate pairs",
    time: "2 minutes ago",
  },
  {
    activity: "Daily analytics report generated successfully",
    time: "2 minutes ago",
  },
];

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

]


const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch admin stats and data
    // const fetchData = async () => {
    //   try {
    //     const statsRes = await api.get('/admin/ai-stats');
    //     setStats(statsRes.data.stats);
    //   } catch (error) {
    //     console.error('Error fetching data:', error);
    //   } finally {
    //     setLoading(false);
    //   }
    // };
    // fetchData();
    setLoading(false);
  }, []);

  if (loading) {
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

      <div className='grid grid-cols-1 lg:grid-cols-2  w-full'>
        <div className="flex flex-col rounded-[10px] border border-fade w-full gap-[21px]  max-w-[715px] p-[23px] max-h-[451px]  bg-white">
          <p className="text-[#1C1C1C] font-semibold text-[20px]">Recent Activities</p>
          <div className='flex flex-col gap-[25px] overflow-y-scroll'>
              {activities.map((activity) => (
               <ActivityItem activity={activity.activity} time={activity.time} key={activity.activity}/>
              ))}
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
