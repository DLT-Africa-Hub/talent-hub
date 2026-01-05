import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BsSearch, BsFilter } from 'react-icons/bs';
import { HiOutlineX } from 'react-icons/hi';
import { Pagination } from '../../components/ui';
import { companyApi } from '../../api/company';
import { LoadingSpinner } from '../../index';
import { ApiError } from '../../types/api';
import CandidatePreviewModal from '../../components/company/CandidatePreviewModal';
import { CandidateProfile } from '../../types/candidates';
import {
  formatExperience,
  DEFAULT_PROFILE_IMAGE,
  formatSalaryPerAnnum,
} from '../../utils/job.utils';
import { WorkExperience } from '../../types/api';

interface Graduate {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  position: string;
  location?: string;
  skills: string[];
  education: {
    degree: string;
    field: string;
    institution: string;
    graduationYear: number;
  };
  rank?: string;
  profilePictureUrl?: string;
  summary?: string;
  expLevel: string;
  expYears: number;
  workExperiences: WorkExperience[];
  cv?: {
    fileUrl: string;
    fileName: string;
  } | null;
  salaryPerAnnum?: number;
  hasUpcomingInterview?: boolean;
  interviewScheduledAt?: string;
}

interface RankStatistics {
  [key: string]: {
    count: number;
    percentage: number;
  };
}

const ExploreGraduates = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy] = useState<'createdAt' | 'name' | 'rank'>(
    'createdAt'
  );
  const [filterRank, setFilterRank] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pageSize = 20;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterRank, sortBy]);

  // Fetch graduates
  const {
    data: graduatesResponse,
    isLoading: loading,
    error: queryError,
    isFetching,
  } = useQuery<{
    graduates: Graduate[];
    rankStatistics: RankStatistics;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: [
      'exploreGraduates',
      currentPage,
      debouncedSearch,
      filterRank,
      sortBy,
    ],
    queryFn: async () => {
      const response = await companyApi.getAvailableGraduates({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
        rank: filterRank !== 'all' ? filterRank : undefined,
        sortBy: sortBy,
      });
      return response;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const graduates = graduatesResponse?.graduates || [];
  const rankStats = graduatesResponse?.rankStatistics || {};
  const pagination = graduatesResponse?.pagination || {
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 0,
  };

  const rankOptions = ['A', 'B', 'C', 'D'];

  // Transform Graduate to CandidateProfile
  const transformGraduateToCandidate = useCallback(
    (graduate: Graduate): CandidateProfile => {
      const experience = formatExperience(graduate.expYears);
      const location = graduate.location || ' ';

      return {
        id: graduate.id,
        name: graduate.name,
        role: graduate.position,
        status: 'matched' as const,
        rank: (graduate.rank as 'A' | 'B' | 'C' | 'D') || 'D',
        statusLabel: 'Available',
        experience,
        location,
        skills: graduate.skills || [],
        image: graduate.profilePictureUrl || DEFAULT_PROFILE_IMAGE,
        summary: graduate.summary,
        matchPercentage: undefined,
        cv: graduate.cv?.fileUrl,
        salaryPerAnnum: graduate.salaryPerAnnum,
        interviewScheduledAt: graduate.interviewScheduledAt,
        hasUpcomingInterview: graduate.hasUpcomingInterview,
      };
    },
    []
  );

  const handlePreviewClick = (graduate: Graduate) => {
    const candidate = transformGraduateToCandidate(graduate);
    setSelectedCandidate(candidate);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCandidate(null);
  };

  const handleViewCV = (candidate?: CandidateProfile) => {
    const cvUrl = candidate?.cv || selectedCandidate?.cv;
    if (cvUrl) {
      window.open(cvUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <div className="py-[20px] px-[20px] pb-[120px] lg:px-0 lg:pr-[20px] flex flex-col gap-6 md:gap-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="font-semibold text-[28px] md:text-[32px] text-[#1C1C1C]">
                Available Graduates
              </h1>
              <p className="text-[14px] md:text-[16px] text-[#1C1C1C80]">
                {pagination.total}{' '}
                {pagination.total === 1 ? 'graduate' : 'graduates'} found
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
                  placeholder="Search graduates, skills, or locations..."
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
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 border rounded-[10px] transition-all ${
                  showFilters || filterRank !== 'all'
                    ? 'border-button bg-button/5 text-button'
                    : 'border-fade bg-white text-[#1C1C1C] hover:border-button/50'
                }`}
              >
                <BsFilter className="text-[18px]" />
                <span className="hidden sm:inline text-[14px] font-medium">
                  Filters
                </span>
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 p-4 bg-[#F8F8F8] rounded-[12px] border border-fade animate-in slide-in-from-top-2 duration-200">
              <span className="text-[14px] font-medium text-[#1C1C1C80]">
                Rank:
              </span>
              <button
                onClick={() => setFilterRank('all')}
                className={`px-4 py-2 rounded-[20px] text-[14px] font-medium transition-all ${
                  filterRank === 'all'
                    ? 'bg-button text-white shadow-sm'
                    : 'bg-white text-[#1C1C1C] border border-fade hover:border-button/50'
                }`}
              >
                All Ranks
              </button>
              {rankOptions.map((rank) => {
                const stats = rankStats[rank];
                const percentage = stats?.percentage || 0;
                return (
                  <button
                    key={rank}
                    onClick={() => setFilterRank(rank)}
                    className={`px-4 py-2 rounded-[20px] text-[14px] font-medium transition-all ${
                      filterRank === rank
                        ? 'bg-button text-white shadow-sm'
                        : 'bg-white text-[#1C1C1C] border border-fade hover:border-button/50'
                    }`}
                  >
                    Rank {rank} ({percentage}%)
                  </button>
                );
              })}
            </div>
          )}

          {(filterRank !== 'all' || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] text-[#1C1C1C80]">
                Active filters:
              </span>
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
              {filterRank !== 'all' && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-button/10 text-button rounded-[20px] text-[14px] font-medium">
                  Rank {filterRank}
                  <button
                    onClick={() => setFilterRank('all')}
                    className="hover:text-button/80"
                    aria-label="Remove rank filter"
                  >
                    <HiOutlineX className="text-[16px]" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Results Section */}
        {loading || isFetching ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner message="Loading graduates..." />
          </div>
        ) : queryError ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <BsSearch className="text-[40px] text-red-400" />
            </div>
            <h3 className="text-[20px] font-semibold text-[#1C1C1C] mb-2">
              Failed to load graduates
            </h3>
            <p className="text-[16px] text-[#1C1C1C80] text-center max-w-md">
              {(queryError as ApiError)?.response?.data?.message ||
                'Unable to fetch graduates. Please try again later.'}
            </p>
          </div>
        ) : graduates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 rounded-full bg-fade flex items-center justify-center mb-4">
              <BsSearch className="text-[40px] text-[#1C1C1C40]" />
            </div>
            <h3 className="text-[20px] font-semibold text-[#1C1C1C] mb-2">
              No graduates found
            </h3>
            <p className="text-[16px] text-[#1C1C1C80] text-center max-w-md">
              {pagination.total === 0
                ? 'No graduates available at the moment. Check back later!'
                : 'Try adjusting your search or filters to find more graduates.'}
            </p>
            {(debouncedSearch || filterRank !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDebouncedSearch('');
                  setFilterRank('all');
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
            {/* Graduate Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {graduates.map((graduate: Graduate) => (
                <div
                  key={graduate.id}
                  className="bg-white rounded-[12px] border border-fade p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handlePreviewClick(graduate)}
                >
                  <div className="flex items-start gap-4 mb-4">
                    {graduate.profilePictureUrl ? (
                      <img
                        src={graduate.profilePictureUrl}
                        alt={graduate.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-button/10 flex items-center justify-center text-button font-semibold text-lg">
                        {graduate.firstName[0]}
                        {graduate.lastName[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-[18px] text-[#1C1C1C] mb-1">
                        {graduate.name}
                      </h3>
                      <p className="text-[14px] text-[#1C1C1C80] mb-2 capitalize">
                        {graduate.position}
                      </p>
                      {graduate.rank && (
                        <span className="inline-block px-3 py-1 bg-button/10 text-button rounded-[20px] text-[12px] font-medium">
                          Rank {graduate.rank}
                        </span>
                      )}
                    </div>
                  </div>
                  {graduate.location && (
                    <p className="text-[14px] text-[#1C1C1C80] mb-3">
                      {graduate.location}
                    </p>
                  )}

                  {graduate.salaryPerAnnum && (
                    <p className="text-[14px] text-[#1C1C1C80] mb-3 font-medium">
                      {formatSalaryPerAnnum(graduate.salaryPerAnnum)}
                    </p>
                  )}
                  {graduate.skills && graduate.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {graduate.skills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-[#F8F8F8] text-[#1C1C1C] rounded-[6px] text-[12px]"
                        >
                          {skill}
                        </span>
                      ))}
                      {graduate.skills.length > 3 && (
                        <span className="px-2 py-1 text-[#1C1C1C80] text-[12px]">
                          +{graduate.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                  {graduate.summary && (
                    <p className="text-[14px] text-[#1C1C1C80] line-clamp-2">
                      {graduate.summary}
                    </p>
                  )}
                </div>
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

      <CandidatePreviewModal
        isOpen={isModalOpen}
        candidate={selectedCandidate}
        onClose={handleCloseModal}
        onViewCV={handleViewCV}
      />
    </>
  );
};

export default ExploreGraduates;
