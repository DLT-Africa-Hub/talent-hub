import { useState } from 'react';
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
      <div className="py-[24px] px-[24px]">
        <p className='text-[22px] font-medium text-[#1C1C1C]'>
          Matched Professionals
        </p>
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
            Candidates will appear here once they apply to your job postings.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CompanyDashboard;
