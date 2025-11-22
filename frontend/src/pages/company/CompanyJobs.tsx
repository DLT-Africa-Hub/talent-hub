import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiPlus } from 'react-icons/fi';
import JobCard from '../../components/company/JobCard';
import JobMatchesModal from '../../components/company/JobMatchesModal';
import { CompanyJob } from '../../data/jobs';
import { companyApi } from '../../api/company';
import {
  DEFAULT_JOB_IMAGE,
  mapJobStatus,
  formatSalaryRange,
  formatJobType,
  getSalaryType,
} from '../../utils/job.utils';
import { LoadingSpinner } from '../../index';
import JobCreationModal from '../../components/company/JobCreationModal';
import { EmptyState } from '../../components/ui';

const CompanyJobs = () => {
  const queryClient = useQueryClient();
  const [isJobModalOpen, setJobModalOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState<string | undefined>(undefined);
  const [isMatchesModalOpen, setIsMatchesModalOpen] = useState(false);

  // Transform API job to CompanyJob format using useCallback
  const transformJob = useCallback(
    (
      job: any
    ): CompanyJob & {
      skills?: string[];
      preferedRank?: string;
      createdAt?: string | Date;
    } => {
      const matchedCount = job.matchCount || job.matches?.length || 0;
      const salaryRange = formatSalaryRange(job.salary);
      const duration = formatJobType(job.jobType || 'Full time');
      const salaryType = getSalaryType(job.jobType || 'Full time');

      return {
        id: job._id || job.id,
        title: job.title || 'Untitled Job',
        location: job.location || 'Location not specified',
        description: job.description || 'No description provided.',
        duration,
        salaryRange,
        salaryType,
        matchedCount,
        status: mapJobStatus(job.status || 'draft'),
        image: DEFAULT_JOB_IMAGE,
        skills: job.requirements?.skills || [],
        preferedRank: job.preferedRank,
        createdAt: job.createdAt,
      };
    },
    []
  );

  // Fetch jobs using React Query
  const {
    data: jobsData,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['companyJobs'],
    queryFn: async () => {
      const response = await companyApi.getJobs({ page: 1, limit: 100 });
      return response.jobs || [];
    },
  });

  // Transform jobs using useMemo to avoid unnecessary re-renders
  const jobs = useMemo(() => {
    if (!jobsData) return [];
    return jobsData.map((job: any) => transformJob(job));
  }, [jobsData, transformJob]);

  // Extract error message
  const error = useMemo(() => {
    if (!queryError) return null;
    const err = queryError as any;
    return (
      err.response?.data?.message || 'Failed to load jobs. Please try again.'
    );
  }, [queryError]);

  const handleNewJob = () => {
    setJobModalOpen(true);
  };

  const handleJobCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['companyJobs'] });
  };

  const handleViewMatches = (job: CompanyJob) => {
    setSelectedJobId(job.id as string);
    setSelectedJobTitle(job.title);
    setIsMatchesModalOpen(true);
  };

  const handleCloseMatchesModal = () => {
    setIsMatchesModalOpen(false);
    setSelectedJobId(null);
    setSelectedJobTitle(undefined);
  };

  return (
    <div className="relative py-[24px] px-[24px]">
      {/* Background Pattern */}
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

      <div className="relative z-10 flex flex-col gap-[32px]">
        {/* Header Section */}
        <div className="flex w-full flex-col gap-[16px] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-[6px] text-[#1C1C1C]">
            <h1 className="text-[28px] font-semibold">Jobs</h1>
            <p className="text-[15px] text-[#1C1C1C80]">
              Review open roles and manage your job postings.
            </p>
          </div>

          <button
            type="button"
            onClick={handleNewJob}
            className="flex w-full items-center justify-center gap-[10px] rounded-[12px] border border-fade bg-[#EAF4E2] px-[22px] py-[14px] text-[16px] font-medium text-button transition hover:border-button hover:bg-[#DBFFC0] lg:w-auto"
          >
            <FiPlus className="text-[20px]" />
            New Job
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-[12px] bg-red-50 border border-red-200 p-[16px]">
            <p className="text-[14px] text-red-600">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && <LoadingSpinner message="Loading jobs..." fullPage />}

        {/* Jobs Grid */}
        {!loading && (
          <>
            {jobs.length > 0 ? (
              <div className="grid grid-cols-1 gap-[24px] xl:grid-cols-2">
                {jobs.map((job: CompanyJob) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onViewMatches={handleViewMatches}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No jobs yet"
                description="Create your first job posting to start matching with talented candidates."
                action={
                  <button
                    onClick={handleNewJob}
                    className="flex items-center gap-[8px] px-[20px] py-[12px] rounded-[10px] bg-button text-white text-[14px] font-semibold hover:bg-[#176300] transition-colors shadow-sm"
                  >
                    <FiPlus className="text-[18px]" />
                    <span>Create a job</span>
                  </button>
                }
              />
            )}
          </>
        )}
      </div>
      <JobCreationModal
        isOpen={isJobModalOpen}
        onClose={() => setJobModalOpen(false)}
        onJobCreated={handleJobCreated}
      />

      <JobMatchesModal
        isOpen={isMatchesModalOpen}
        jobId={selectedJobId}
        jobTitle={selectedJobTitle}
        onClose={handleCloseMatchesModal}
      />
    </div>
  );
};

export default CompanyJobs;
