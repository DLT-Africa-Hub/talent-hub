import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { BsSearch } from 'react-icons/bs';
import { HiOutlineDocumentText } from 'react-icons/hi2';
import {
  HiOutlineLink,
  HiOutlineClock,
  HiOutlineHand,
  HiOutlineFilter,
} from 'react-icons/hi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { companyApi } from '../../api/company';
import { LoadingSpinner } from '../../index';

const CompanyDashboard = () => {
  const results = useQueries({
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
      },
    ],
  });

  const [jobsQuery, applicationsQuery, hiredQuery] = results;

  const stats = useMemo(() => {
    const offered = jobsQuery.data?.pagination?.total || 0;
    const applicants = applicationsQuery.data?.pagination?.total || 0;
    const hired = hiredQuery.data?.pagination?.total || 0;

    return {
      offered,
      applicants,
      hired,
    };
  }, [jobsQuery.data, applicationsQuery.data, hiredQuery.data]);

  const loading =
    jobsQuery.isLoading || applicationsQuery.isLoading || hiredQuery.isLoading;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filters = [
    { id: 'applied', label: 'Applied', icon: HiOutlineDocumentText },
    { id: 'matched', label: 'Matched', icon: HiOutlineLink },
    { id: 'hired', label: 'Hired', icon: HiOutlineClock },
    { id: 'pending', label: 'Pending', icon: HiOutlineHand },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner message="Loading dashboard..." fullPage />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="relative py-[24px] px-[24px]">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <svg
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
          >
            <path
              fill="#1B7700"
              d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex gap-[16px] mb-[28px] justify-end">
            <div className="bg-white rounded-[10px] border border-fade px-[20px] py-[16px] shadow-sm min-w-[120px]">
              <p className="text-[#1C1C1C80] text-[12px] mb-[6px] font-medium">
                Offered
              </p>
              <p className="text-[#1C1C1C] text-[20px] font-semibold">
                {stats.offered}+
              </p>
            </div>
            <div className="bg-white rounded-[10px] border border-fade px-[20px] py-[16px] shadow-sm min-w-[120px]">
              <p className="text-[#1C1C1C80] text-[12px] mb-[6px] font-medium">
                Applicants
              </p>
              <p className="text-[#1C1C1C] text-[20px] font-semibold">
                {stats.applicants}+
              </p>
            </div>
            <div className="bg-white rounded-[10px] border border-fade px-[20px] py-[16px] shadow-sm min-w-[120px]">
              <p className="text-[#1C1C1C80] text-[12px] mb-[6px] font-medium">
                Hired
              </p>
              <p className="text-[#1C1C1C] text-[20px] font-semibold">
                {stats.hired}+
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[16px] border border-fade p-[24px]">
            <div className="flex items-center gap-[10px] mb-[20px]">
              <div className="flex-1 relative">
                <BsSearch className="absolute left-[14px] top-1/2 transform -translate-y-1/2 text-[#1C1C1C80] text-[16px]" />
                <input
                  type="text"
                  placeholder="Search candidates"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-[44px] pl-[40px] pr-[16px] rounded-[10px] border border-[#D9E6C9] bg-[#F8F8F8] text-[14px] text-[#1C1C1C] placeholder:text-[#1C1C1C66] focus:border-button focus:outline-none transition-colors"
                />
              </div>
              <button className="h-[44px] w-[44px] flex items-center justify-center rounded-[10px] border border-[#D9E6C9] bg-[#F8F8F8] text-[#1C1C1C] hover:bg-[#F0F0F0] transition-colors">
                <HiOutlineFilter className="text-[18px]" />
              </button>
            </div>

            <div className="flex gap-[10px] mb-[32px] flex-wrap">
              {filters.map((filter) => {
                const Icon = filter.icon;
                const isActive = activeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(isActive ? null : filter.id)}
                    className={`flex items-center gap-[6px] px-[16px] py-[8px] rounded-full border transition-colors ${
                      isActive
                        ? 'border-button bg-[#DBFFC0] text-[#1C1C1C]'
                        : 'border-[#D9E6C9] bg-[#F8F8F8] text-[#1C1C1C80] hover:border-[#1B770080] hover:bg-[#F0F0F0]'
                    }`}
                  >
                    <Icon className="text-[16px]" />
                    <span className="text-[14px] font-medium">
                      {filter.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col items-center justify-center py-[60px]">
              <div className="w-[100px] h-[100px] rounded-[16px] bg-[#E8F5E3] flex items-center justify-center mb-[20px]">
                <div className="w-[64px] h-[64px] rounded-[10px] bg-[#DBFFC0] flex items-center justify-center">
                  <span className="text-[32px] text-button font-bold">×</span>
                </div>
              </div>
              <p className="text-[16px] font-semibold text-[#1C1C1C] mb-[8px]">
                No data yet
              </p>
              <p className="text-[14px] text-[#1C1C1C80] text-center max-w-[400px]">
                Candidates will appear here once they apply to your job
                postings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CompanyDashboard;
