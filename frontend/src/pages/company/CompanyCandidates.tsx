import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BsSearch } from 'react-icons/bs';
import CandidateCard from '../../components/company/CandidateCard';
import { CandidateProfile, CandidateStatus } from '../../data/candidates';
import { companyApi } from '../../api/company';
import {
  candidateStatusFilters,
  mapApplicationStatusToCandidateStatus,
  formatExperience,
  formatLocation,
  getCandidateRank,
  DEFAULT_PROFILE_IMAGE,
} from '../../utils/job.utils';
import { LoadingSpinner } from '../../index';
import { MdFilterList } from 'react-icons/md';

const CompanyCandidates = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<CandidateStatus | 'all'>(
    'applied'
  );

  // Transform API application to CandidateProfile using useCallback
  const transformApplication = useCallback(
    (app: any, index: number): CandidateProfile => {
      const graduate = app.graduateId || {};
      const job = app.jobId || {};

      const hasMatch = !!app.matchId;
      const candidateStatus = mapApplicationStatusToCandidateStatus(
        app.status,
        hasMatch
      );

      const fullName = `${graduate.firstName || ''} ${
        graduate.lastName || ''
      }`.trim();

      return {
        id: app._id || index,
        name: fullName || 'Unknown Candidate',
        role: job.title || graduate.position || 'Developer',
        status: candidateStatus,
        rank: getCandidateRank(graduate.rank),
        statusLabel:
          candidateStatus.charAt(0).toUpperCase() + candidateStatus.slice(1),
        experience: formatExperience(graduate.expYears || 0),
        location: formatLocation(job.location),
        skills: (graduate.skills || []).slice(0, 3),
        image: graduate.profilePictureUrl || DEFAULT_PROFILE_IMAGE,
      };
    },
    []
  );

  // Fetch candidates using React Query
  const {
    data: applicationsResponse,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['companyApplications'],
    queryFn: async () => {
      const response = await companyApi.getApplications({
        page: 1,
        limit: 100,
      });
      return response;
    },
  });

  // Extract applications array from response
  const applicationsData = useMemo(() => {
    if (!applicationsResponse) return [];
    // Handle both cases: direct array or object with applications property
    if (Array.isArray(applicationsResponse)) {
      return applicationsResponse;
    }
    if (
      applicationsResponse?.applications &&
      Array.isArray(applicationsResponse.applications)
    ) {
      return applicationsResponse.applications;
    }
    return [];
  }, [applicationsResponse]);

  // Transform applications to candidates using useMemo
  const candidates = useMemo(() => {
    if (!applicationsData || !Array.isArray(applicationsData)) return [];
    return applicationsData.map((app: any, index: number) =>
      transformApplication(app, index)
    );
  }, [applicationsData, transformApplication]);

  // Extract error message
  const error = useMemo(() => {
    if (!queryError) return null;
    const err = queryError as any;
    return (
      err.response?.data?.message ||
      'Failed to load candidates. Please try again.'
    );
  }, [queryError]);

  const filteredCandidates = useMemo(() => {
    let filtered = candidates;

    // Filter by status
    if (activeStatus !== 'all') {
      filtered = filtered.filter(
        (candidate: CandidateProfile) => candidate.status === activeStatus
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (candidate: CandidateProfile) =>
          candidate.name.toLowerCase().includes(query) ||
          candidate.role.toLowerCase().includes(query) ||
          candidate.skills.some((skill: string) =>
            skill.toLowerCase().includes(query)
          ) ||
          candidate.location.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [candidates, activeStatus, searchQuery]);

  const handlePreview = (candidate: CandidateProfile) => {
    navigate(`/candidate-preview/${candidate.id}`);
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

      <div className="relative z-10">
        <div className="flex flex-col gap-[16px] mb-[24px] justify-end items-end">
          <div className="flex items-center gap-[12px]">
            <div className=" relative">
              <BsSearch className="absolute left-[16px] top-1/2 -translate-y-1/2 text-[#1C1C1C66] text-[18px]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates"
                className="w-[659px] px-[20px] py-[10px] rounded-[10px] border border-[#DCE5D5] bg-white pl-[46px] pr-[16px] text-[14px] text-[#1C1C1C] placeholder:text-[#1C1C1C66] focus:outline-none focus:border-button transition"
              />
            </div>
            <button
              type="button"
              className=" w-[50px] p-[10px] rounded-[14px] border border-[#DCE5D5] bg-white text-[#1C1C1C] flex items-center justify-center hover:border-button hover:text-button transition"
            >
              <MdFilterList className="text-[20px]" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-[10px] flex-wrap">
            {candidateStatusFilters.map((filter) => {
              const isActive = filter.value === activeStatus;
              const FilterIcon = filter.icon;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveStatus(filter.value)}
                  className={`flex items-center gap-[8px] px-[18px] py-[10px] rounded-[9px] border text-[14px] font-medium transition ${
                    isActive
                      ? 'border-button bg-[#DBFFC0] text-[#1C1C1C]'
                      : 'border-[#E5E7EB] bg-white text-[#1C1C1C80] hover:border-[#C5D2BF]'
                  }`}
                >
                  {FilterIcon && (
                    <FilterIcon
                      className={`text-[16px] ${
                        isActive ? 'text-button' : 'text-[#1C1C1C66]'
                      }`}
                    />
                  )}
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-[24px] rounded-[12px] bg-red-50 border border-red-200 p-[16px]">
            <p className="text-[14px] text-red-600">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && <LoadingSpinner message="Loading candidates..." fullPage />}

        {/* Candidates Grid */}
        {!loading && (
          <>
            {filteredCandidates.length > 0 ? (
              <div className="grid grid-cols-1 gap-[20px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCandidates.map((candidate: CandidateProfile) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    onPreview={handlePreview}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-[80px] bg-white rounded-[16px] border border-fade">
                <div className="w-[100px] h-[100px] rounded-[16px] bg-[#E8F5E3] flex items-center justify-center mb-[20px]">
                  <div className="w-[64px] h-[64px] rounded-[10px] bg-[#DBFFC0] flex items-center justify-center">
                    <span className="text-[32px] text-button font-bold">×</span>
                  </div>
                </div>
                <p className="text-[16px] font-semibold text-[#1C1C1C] mb-[8px]">
                  {searchQuery || activeStatus !== 'all'
                    ? 'No candidates found'
                    : 'No candidates yet'}
                </p>
                <p className="text-[14px] text-[#1C1C1C80] text-center max-w-[400px]">
                  {searchQuery || activeStatus !== 'all'
                    ? 'Try adjusting your search or filters to discover more candidates.'
                    : 'Candidates will appear here once they apply to your job postings.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CompanyCandidates;
