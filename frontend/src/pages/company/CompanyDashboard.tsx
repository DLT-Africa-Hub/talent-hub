import { useQueries } from '@tanstack/react-query';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { companyApi } from '../../api/company';
import { LoadingSpinner } from '../../index';
import { EmptyState } from '../../components/ui';

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
        <p className="text-[22px] font-medium text-[#1C1C1C]">
          Matched Professionals
        </p>
        <EmptyState
          title="No data yet"
          description="Candidates will appear here once they apply to your job postings."
          variant="minimal"
        />
      </div>
    </DashboardLayout>
  );
};

export default CompanyDashboard;
