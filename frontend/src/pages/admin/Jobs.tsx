// pages/admin/Jobs.tsx - Updated to use modal

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { SearchIcon, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { IoFilterOutline } from 'react-icons/io5';
import JobItemComponent from '../../components/admin/jobs/job-item';
import { adminApi } from '../../api/admin';
import { LoadingSpinner, EmptyState } from '../../components/ui';
import { formatSalaryRange, getSalaryType } from '../../utils/job.utils';
import { ApiJob } from '../../types/api';
import { toast } from 'react-hot-toast';
import JobDetailsModal from '@/components/admin/jobs/job-modal';

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

interface FilterState {
  status: string;
  jobType: string;
  preferedRank: string;
  location: string;
}

const Jobs = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    jobType: '',
    preferedRank: '',
    location: '',
  });
  const [page, setPage] = useState(1);
  const limit = 20;

  // Check if we need to open a job from navigation state
  useEffect(() => {
    const state = location.state as { openJobId?: string } | null;
    if (state?.openJobId) {
      setSelectedJobId(state.openJobId);
      // Clear the state to prevent reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const {
    data: jobsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['adminJobs', page, searchQuery, filters],
    queryFn: async () => {
      const params: any = {
        page,
        limit,
      };

      if (searchQuery) params.q = searchQuery;
      if (filters.status) params.status = filters.status;
      if (filters.jobType) params.jobType = filters.jobType;
      if (filters.preferedRank) params.preferedRank = filters.preferedRank;
      if (filters.location) params.location = filters.location;

      return await adminApi.getAllJobs(params);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      jobId,
      status,
    }: {
      jobId: string;
      status: 'active' | 'closed' | 'draft';
    }) => adminApi.updateJobStatus(jobId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
      toast.success('Job status updated successfully');
    },
    onError: () => {
      toast.error('Failed to update job status');
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: (jobId: string) => adminApi.deleteJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
      toast.success('Job deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete job');
    },
  });

  const jobs: JobItem[] =
    jobsResponse?.data?.map((job: ApiJob) => {
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
    }) || [];

  const pagination = jobsResponse?.pagination;

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      jobType: '',
      preferedRank: '',
      location: '',
    });
    setPage(1);
  };

  const handleStatusToggle = (jobId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'closed' : 'active';
    updateStatusMutation.mutate({
      jobId,
      status: newStatus as 'active' | 'closed',
    });
  };

  const handleDelete = (jobId: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this job? This action cannot be undone.'
      )
    ) {
      deleteJobMutation.mutate(jobId);
    }
  };

  const handleViewJob = (jobId: string) => {
    setSelectedJobId(jobId);
  };

  const handleCloseModal = () => {
    setSelectedJobId(null);
  };

  return (
    <>
      <div className="pb-[100px] py-[20px] px-[20px] lg:px-0 lg:pr-[20px] flex flex-col gap-[43px] font-inter items-start overflow-y-auto h-full">
        <div className="flex flex-col gap-2.5">
          <p className="text-[#1C1C1C] font-semibold text-[26px]">Jobs</p>
          <p className="text-[#1C1C1CBF] font-medium text-[18px]">
            Manage all job postings
          </p>
        </div>

        <div className="flex flex-col gap-[18px] w-full">
          {/* Search and Filter Bar */}
          <div className="flex gap-[20px] w-full">
            <div className="flex items-center border w-full border-fade rounded-[10px]">
              <p className="text-fade p-[15px]">
                <SearchIcon />
              </p>
              <div className="w-px h-[20px] bg-fade" />
              <input
                type="text"
                placeholder="Search jobs by title"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full outline-none text-[16px] p-[15px] placeholder:text-fade"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`text-fade text-[20px] px-[20px] py-[15px] border border-fade rounded-[10px] cursor-pointer hover:bg-gray-50 transition-colors ${
                showFilters ? 'bg-gray-50' : ''
              }`}
            >
              <IoFilterOutline />
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="border border-fade rounded-[10px] p-[20px] bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      handleFilterChange('status', e.target.value)
                    }
                    className="w-full p-2 border border-fade rounded-lg outline-none"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Type
                  </label>
                  <select
                    value={filters.jobType}
                    onChange={(e) =>
                      handleFilterChange('jobType', e.target.value)
                    }
                    className="w-full p-2 border border-fade rounded-lg outline-none"
                  >
                    <option value="">All Types</option>
                    <option value="Full time">Full Time</option>
                    <option value="Part time">Part Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Rank
                  </label>
                  <select
                    value={filters.preferedRank}
                    onChange={(e) =>
                      handleFilterChange('preferedRank', e.target.value)
                    }
                    className="w-full p-2 border border-fade rounded-lg outline-none"
                  >
                    <option value="">All Ranks</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="A and B">A and B</option>
                    <option value="B and C">B and C</option>
                    <option value="C and D">C and D</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={filters.location}
                    onChange={(e) =>
                      handleFilterChange('location', e.target.value)
                    }
                    placeholder="Enter location"
                    className="w-full p-2 border border-fade rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          {/* Stats Summary */}
          <div className="flex gap-4 text-sm text-gray-600">
            {pagination && (
              <span>
                Showing {(page - 1) * limit + 1}-
                {Math.min(page * limit, pagination.total)} of {pagination.total}{' '}
                jobs
              </span>
            )}
          </div>

          {/* Jobs List */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <EmptyState
              title="Failed to load jobs"
              description="Please try again later"
            />
          ) : !jobs || jobs.length === 0 ? (
            <EmptyState
              title="No jobs found"
              description={
                searchQuery || Object.values(filters).some((v) => v)
                  ? 'Try adjusting your filters'
                  : 'No job postings have been created yet'
              }
            />
          ) : (
            <>
              <div className="flex flex-col gap-[20px] w-full">
                {jobs.map((job: JobItem) => (
                  <div
                    key={job.id}
                    className="relative group cursor-pointer"
                    onClick={() => handleViewJob(job.id)}
                  >
                    <JobItemComponent
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

                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusToggle(job.id, job.status.toLowerCase());
                        }}
                        className={`p-2 ${
                          job.status === 'Active'
                            ? 'bg-orange-500 hover:bg-orange-600'
                            : 'bg-green-500 hover:bg-green-600'
                        } text-white rounded-lg transition-colors`}
                        title={
                          job.status === 'Active' ? 'Close Job' : 'Activate Job'
                        }
                      >
                        {job.status === 'Active' ? (
                          <XCircle size={16} />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(job.id);
                        }}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        title="Delete Job"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-fade rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(pagination.pages, p + 1))
                    }
                    disabled={page === pagination.pages}
                    className="px-4 py-2 border border-fade rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Job Details Modal */}
      {selectedJobId && (
        <JobDetailsModal
          jobId={selectedJobId}
          isOpen={!!selectedJobId}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export default Jobs;
