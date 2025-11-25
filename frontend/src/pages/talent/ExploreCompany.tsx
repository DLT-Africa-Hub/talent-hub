import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BsSearch, BsFilter } from 'react-icons/bs';
import { HiOutlineX } from 'react-icons/hi';

import CompanyFlatCard from '../../components/explore/CompanyFlatCard';
import CompanyCard, { Company } from '../../components/explore/CompanyCard';
import CompanyPreviewModal from '../../components/explore/CompanyPreviewModal';
import { Pagination } from '../../components/ui';
import { graduateApi } from '../../api/graduate';
import { LoadingSpinner } from '../../index';
import {
  DEFAULT_JOB_IMAGE,
  formatSalaryRange,
  formatJobType,
  getSalaryType,
} from '../../utils/job.utils';

interface AvailableJob {
  id: string;
  title?: string;
  companyName?: string;
  location?: string;
  jobType?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  matchScore?: number | null;
}

const ExploreCompany = () => {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'createdAt' | 'title' | 'salary'>('createdAt');
  const [filterContract, setFilterContract] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search change
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterContract, sortBy]);

  // Fetch available jobs from API with server-side pagination and filtering
  const {
    data: jobsResponse,
    isLoading: loading,
    error: queryError,
    isFetching,
  } = useQuery<{
    jobs: AvailableJob[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: [
      'exploreJobs',
      currentPage,
      debouncedSearch,
      filterContract,
      sortBy,
    ],
    queryFn: async () => {
      const response = await graduateApi.getAvailableJobs({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
        jobType: filterContract !== 'all' ? filterContract : undefined,
        sortBy: sortBy,
      });
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
  });

  const jobsData = jobsResponse?.jobs || [];
  const pagination = jobsResponse?.pagination || {
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 0,
  };

  // Transform job data to Company format
  const transformJobToCompany = useCallback(
    (job: AvailableJob, index: number): Company => {
      const jobType = job.jobType || 'Full time';
      const salaryRange = formatSalaryRange(job.salary);
      const salaryType = getSalaryType(jobType);
      const formattedJobType = formatJobType(jobType);

      let contractString = formattedJobType;
      if (jobType === 'Contract') {
        contractString = 'Contract';
      } else if (jobType === 'Internship') {
        contractString = 'Internship';
      }

      const companyName = job.companyName || 'Company';

      const cardId =
        parseInt(job.id?.slice(-8) || '', 16) || index + 1;

      const rawMatch = typeof job.matchScore === 'number' ? job.matchScore : 0;
      const matchScore = Math.min(100, Math.max(0, Math.round(rawMatch)));

      return {
        id: cardId,
        jobId: job.id,
        name: companyName,
        role: job.title || 'Position',
        match: matchScore,
        contract: contractString,
        location: job.location || 'Location not specified',
        wageType: salaryType,
        wage:
          salaryRange === 'Not specified'
            ? '—'
            : `${salaryRange} ${salaryType}`,
        image: DEFAULT_JOB_IMAGE,
      };
    },
    []
  );

  // Transform all jobs to companies
  const companies = useMemo(() => {
    if (!jobsData || jobsData.length === 0) {
      return [];
    }
    return jobsData.map((job: AvailableJob, index: number) =>
      transformJobToCompany(job, index)
    );
  }, [jobsData, transformJobToCompany]);

  const handlePreviewClick = (companyId: number) => {
    const company = companies.find((c: Company) => c.id === companyId);
    if (company) {
      console.log(company)
      setSelectedCompany(company);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCompany(null);
  };

  const handleChat = () => {
    // TODO: Navigate to chat
  };

  const handleApply = () => {
    // TODO: Handle application
  };

  // Companies are already filtered and sorted on the server
  // No need for client-side filtering/sorting
  const filteredAndSortedCompanies = companies;

  const contractTypes = ['all', 'full-time', 'contract'];

  return (
    <>
      <div className="py-[20px] px-[20px] pb-[120px] lg:px-0 lg:pr-[20px] flex flex-col gap-6 md:gap-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="font-semibold text-[28px] md:text-[32px] text-[#1C1C1C]">
                Available Opportunities
              </h1>
              <p className="text-[14px] md:text-[16px] text-[#1C1C1C80]">
                {pagination.total} {pagination.total === 1 ? 'job' : 'jobs'} found
                {pagination.total > 0 && (
                  <span className="ml-1">
                    (Page {pagination.page} of {pagination.totalPages})
                  </span>
                )}
              </p>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:max-w-[708px]">
              <div className="flex gap-2.5 items-center flex-1 text-fade px-4 py-3 border border-fade rounded-[10px] bg-white focus-within:border-button focus-within:ring-2 focus-within:ring-button/20 transition-all">
                <BsSearch className="text-[18px] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full placeholder:text-fade text-[#1c1c1c] outline-none bg-transparent"
                  placeholder="Search companies, roles, or locations..."
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-fade hover:text-[#1C1C1C] transition-colors"
                    aria-label="Clear search"
                  >
                    <HiOutlineX className="text-[18px]" />
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-3 border rounded-[10px] transition-all ${
                    showFilters || filterContract !== 'all'
                      ? 'border-button bg-button/5 text-button'
                      : 'border-fade bg-white text-[#1C1C1C] hover:border-button/50'
                  }`}
                >
                  <BsFilter className="text-[18px]" />
                  <span className="hidden sm:inline text-[14px] font-medium">Filters</span>
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'title' | 'salary')}
                  className="px-4 py-3 border border-fade rounded-[10px] bg-white text-[#1C1C1C] outline-none focus:border-button focus:ring-2 focus:ring-button/20 transition-all cursor-pointer text-[14px] font-medium"
                >
                  <option value="createdAt">Sort by Newest</option>
                  <option value="title">Sort by Title</option>
                  <option value="salary">Sort by Salary</option>
                </select>
              </div>
            </div>
          </div>

          {/* Filter Chips */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 p-4 bg-[#F8F8F8] rounded-[12px] border border-fade animate-in slide-in-from-top-2 duration-200">
              <span className="text-[14px] font-medium text-[#1C1C1C80]">Contract Type:</span>
              {contractTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterContract(type)}
                  className={`px-4 py-2 rounded-[20px] text-[14px] font-medium transition-all capitalize ${
                    filterContract === type
                      ? 'bg-button text-white shadow-sm'
                      : 'bg-white text-[#1C1C1C] border border-fade hover:border-button/50'
                  }`}
                >
                  {type === 'all' ? 'All Types' : type.replace('-', ' ')}
                </button>
              ))}
            </div>
          )}

          {/* Active Filters Display */}
          {(filterContract !== 'all' || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] text-[#1C1C1C80]">Active filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-button/10 text-button rounded-[20px] text-[14px] font-medium">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    className="hover:text-button/80"
                    aria-label="Remove search filter"
                  >
                    <HiOutlineX className="text-[16px]" />
                  </button>
                </span>
              )}
              {filterContract !== 'all' && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-button/10 text-button rounded-[20px] text-[14px] font-medium">
                  {filterContract.replace('-', ' ')}
                  <button
                    onClick={() => setFilterContract('all')}
                    className="hover:text-button/80"
                    aria-label="Remove contract filter"
                  >
                    <HiOutlineX className="text-[16px]" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Results Section */}
        {(loading || isFetching) ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner message="Loading opportunities..." />
          </div>
        ) : queryError ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <BsSearch className="text-[40px] text-red-400" />
            </div>
            <h3 className="text-[20px] font-semibold text-[#1C1C1C] mb-2">
              Failed to load opportunities
            </h3>
            <p className="text-[16px] text-[#1C1C1C80] text-center max-w-md">
              {(queryError as any)?.response?.data?.message ||
                'Unable to fetch job opportunities. Please try again later.'}
            </p>
          </div>
        ) : filteredAndSortedCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 rounded-full bg-fade flex items-center justify-center mb-4">
              <BsSearch className="text-[40px] text-[#1C1C1C40]" />
            </div>
            <h3 className="text-[20px] font-semibold text-[#1C1C1C] mb-2">No jobs found</h3>
            <p className="text-[16px] text-[#1C1C1C80] text-center max-w-md">
              {pagination.total === 0
                ? 'No job opportunities available at the moment. Check back later!'
                : 'Try adjusting your search or filters to find more opportunities.'}
            </p>
            {(debouncedSearch || filterContract !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDebouncedSearch('');
                  setFilterContract('all');
                  setShowFilters(false);
                  setCurrentPage(1);
                }}
                className="mt-4 px-6 py-2 bg-button text-white rounded-[10px] font-medium hover:bg-[#176300] transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop: Flat Cards */}
            <div className="hidden lg:flex flex-col gap-4 w-full">
              {filteredAndSortedCompanies.map((company: Company) => (
                <CompanyFlatCard
                  key={company.id}
                  company={company}
                  buttonText="Preview"
                  onPreviewClick={handlePreviewClick}
                />
              ))}
            </div>

            {/* Mobile/Tablet: Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:hidden w-full">
              {filteredAndSortedCompanies.map((company: Company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  buttonText="Preview"
                  onPreviewClick={handlePreviewClick}
                />
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setCurrentPage}
              maxVisiblePages={5}
            />
          </div>
        )}
      </div>

      <CompanyPreviewModal
        isOpen={isModalOpen}
        company={selectedCompany}
        onClose={handleCloseModal}
        onChat={handleChat}
        onApply={handleApply}
      />
    </>
  );
};

export default ExploreCompany;
