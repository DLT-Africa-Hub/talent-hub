import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchIcon } from 'lucide-react';
import { IoFilterOutline } from 'react-icons/io5';
import JobItemComponent from '../../components/admin/jobs/job-item';
import { adminApi } from '../../api/admin';
import { LoadingSpinner, EmptyState } from '../../components/ui';
import { formatSalaryRange, getSalaryType } from '../../utils/job.utils';
import { ApiJob } from '../../types/api';

export interface JobItem {
  id: string;
  title: string;
  company: string;
  location: string;
  status: 'Active' | 'Hired' | 'Closed';
  applicants: number;
  views: number;
  salary: string;
  postedAt: string;
}

const Jobs = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: jobsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['adminJobs', searchQuery],
    queryFn: async () => {
      const response = await adminApi.getAllJobs({
        page: 1,
        limit: 100,
        ...(searchQuery && { search: searchQuery }),
      });
      // Transform job data to JobItem format
      return (response.data || []).map((job: ApiJob) => {
        const salaryRange = formatSalaryRange(job.salary);
        const salaryType = job.jobType ? getSalaryType(job.jobType) : 'Annual';
        const salary =
          salaryRange === 'Not specified'
            ? 'Not specified'
            : `${salaryRange} ${salaryType}`;

        const postedDate = job.createdAt ? new Date(job.createdAt) : new Date();
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - postedDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const postedAt =
          diffDays === 1
            ? '1 day ago'
            : diffDays < 7
              ? `${diffDays} days ago`
              : diffDays < 30
                ? `${Math.ceil(diffDays / 7)} weeks ago`
                : `${Math.ceil(diffDays / 30)} months ago`;

        return {
          id: job._id?.toString() || job.id,
          title: job.title,
          company: job.companyId?.companyName || 'Unknown Company',
          location: job.location || 'Not specified',
          status:
            job.status === 'active'
              ? ('Active' as const)
              : job.status === 'closed' || job.status === 'inactive'
                ? ('Closed' as const)
                : ('Active' as const),
          applicants: job.applicantsCount || 0,
          views: job.views || 0,
          salary,
          postedAt,
        };
      });
    },
  });

  return (
    <div className="py-[20px] px-[20px]  lg:px-0 lg:pr-[20px] flex flex-col gap-[43px] font-inter items-start overflow-y-auto h-full">
      <div className="flex flex-col gap-2.5">
        <p className="text-[#1C1C1C] font-semibold text-[26px]">Jobs</p>
        <p className="text-[#1C1C1CBF] font-medium text-[18px]">
          Manage all job postings
        </p>
      </div>

      <div className="flex flex-col gap-[18px] w-full">
        <div className="flex gap-[20px] w-full">
          <div className="flex items-center border w-full border-fade rounded-[10px]">
            <p className="text-fade  p-[15px]">
              <SearchIcon />
            </p>
            <div className="w-px h-[20px] bg-fade" />
            <input
              type="text"
              placeholder="Search jobs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full outline-none  text-[16px] p-[15px] placeholder:text-fade"
            />
          </div>
          <div className="text-fade text-[20px] px-[20px] py-[15px] border border-fade rounded-[10px] cursor-pointer">
            <IoFilterOutline />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <EmptyState
            title="Failed to load jobs"
            description="Please try again later"
          />
        ) : !jobsData || jobsData.length === 0 ? (
          <EmptyState
            title="No jobs found"
            description="No job postings have been created yet"
          />
        ) : (
          <div className="flex flex-col gap-[20px] w-full">
            {jobsData.map((job: JobItem) => (
              <JobItemComponent
                key={job.id}
                applicants={job.applicants}
                company={job.company}
                id={job.id}
                location={job.location}
                postedAt={job.postedAt}
                salary={job.salary}
                status={job.status}
                title={job.title}
                views={job.views}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Jobs;
