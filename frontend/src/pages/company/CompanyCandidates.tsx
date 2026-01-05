import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useCompanyApplications,
  useCompanyMatches,
  extractApplications,
  extractMatches,
} from '../../hooks/useCompanyData';
import { BsSearch } from 'react-icons/bs';
import CandidateCard from '../../components/company/CandidateCard';
import CandidatePreviewModal from '../../components/company/CandidatePreviewModal';
import ScheduleInterviewModal from '../../components/company/ScheduleInterviewModal';
import { CandidateProfile, CandidateStatus } from '../../types/candidates';
import { companyApi } from '../../api/company';
import { ApiError } from '../../types/api';
import { candidateStatusFilters } from '../../utils/job.utils';
import {
  transformApplication,
  transformMatch,
} from '../../utils/candidate.utils';
import { LoadingSpinner } from '../../index';
import { EmptyState } from '../../components/ui';
import { ApiApplication, ApiMatch } from '../../types/api';

const CompanyCandidates = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<CandidateStatus | 'all'>(
    'all'
  );
  const [selectedJobId] = useState<string | 'all'>('all');
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMultiSlotModalOpen, setIsMultiSlotModalOpen] = useState(false);
  const [multiSlotCandidate, setMultiSlotCandidate] =
    useState<CandidateProfile | null>(null);

  const transformApplicationMemo = useCallback(
    (app: ApiApplication, index: number) => transformApplication(app, index),
    []
  );

  const transformMatchMemo = useCallback(
    (match: ApiMatch, index: number) => transformMatch(match, index),
    []
  );

  // Map candidate status to backend application status
  const getBackendStatus = (
    candidateStatus: CandidateStatus | 'all'
  ): string | undefined => {
    if (candidateStatus === 'all') return undefined;
    if (candidateStatus === 'hired') return 'hired';
    if (candidateStatus === 'matched') return undefined;

    if (candidateStatus === 'applied') return undefined;
    if (candidateStatus === 'pending') return undefined;
    return undefined;
  };

  // Fetch applications using custom hook with backend filtering
  const {
    data: applicationsResponse,
    isLoading: loadingApplications,
    error: applicationsError,
  } = useCompanyApplications({
    page: 1,
    limit: 100,
    status: getBackendStatus(activeStatus),
    jobId: selectedJobId !== 'all' ? selectedJobId : undefined,
    search: searchQuery.trim() || undefined,
    refetchInterval: 10000,
  });

  // Fetch matches using custom hook with backend filtering
  // Don't fetch matches when filtering by 'hired' or 'pending' - these only come from applications
  const shouldFetchMatches =
    activeStatus !== 'hired' && activeStatus !== 'pending';
  const {
    data: matchesResponse,
    isLoading: loadingMatches,
    error: matchesError,
  } = useCompanyMatches({
    page: 1,
    limit: 100,
    search: searchQuery.trim() || undefined,
    enabled: shouldFetchMatches,
  });

  // Extract applications array from response
  const applicationsData = useMemo(
    () => extractApplications(applicationsResponse),
    [applicationsResponse]
  );

  // Extract matches array from response
  const matchesData = useMemo(
    () => extractMatches(matchesResponse),
    [matchesResponse]
  );

  // Transform applications to candidates using useMemo
  const applicationCandidates = useMemo(() => {
    if (!applicationsData || !Array.isArray(applicationsData)) return [];
    return applicationsData.map((app: ApiApplication, index: number) =>
      transformApplicationMemo(app, index)
    );
  }, [applicationsData, transformApplicationMemo]);

  // Transform matches to candidates using useMemo
  const matchCandidates = useMemo(() => {
    if (!matchesData || !Array.isArray(matchesData)) return [];
    return matchesData.map((match: ApiMatch, index: number) =>
      transformMatchMemo(match, index)
    );
  }, [matchesData, transformMatchMemo]);

  // Combine candidates, avoiding duplicates (merge matches with applications intelligently)
  const candidates = useMemo(() => {
    // When filtering by 'hired' or 'pending', only use applications (no matches)
    const shouldIncludeMatches =
      activeStatus !== 'hired' && activeStatus !== 'pending';

    // Use a composite key: jobId + name to identify unique candidate-job combinations
    const candidateMap = new Map<
      string,
      CandidateProfile & { hasMatch?: boolean; hasApplication?: boolean }
    >();
    const matchMap = new Map<string, CandidateProfile>();

    // Store matches first for later merging (only if we should include matches)
    if (shouldIncludeMatches) {
      matchCandidates.forEach((candidate) => {
        const uniqueKey =
          candidate.jobId && candidate.name
            ? `${candidate.jobId}-${candidate.name}`
            : String(candidate.id);
        matchMap.set(uniqueKey, candidate);
      });
    }

    // Process applications and merge with matches if available
    applicationCandidates.forEach((candidate) => {
      const uniqueKey =
        candidate.jobId && candidate.name
          ? `${candidate.jobId}-${candidate.name}`
          : String(candidate.id);

      // Check if there's a matching match for this candidate-job combination
      const matchingMatch = shouldIncludeMatches
        ? matchMap.get(uniqueKey)
        : undefined;

      if (matchingMatch) {
        // Merge: use application data but prioritize "matched" status when there's a match
        // If there's a match, show "matched" unless application has progressed to "hired" or "pending" (offer sent)
        // Status hierarchy: applied < matched < pending < hired
        const finalStatus =
          candidate.status === 'hired' || candidate.status === 'pending'
            ? candidate.status // Keep hired/pending if application has progressed that far
            : 'matched'; // Otherwise show as "matched" when there's a match available

        const mergedCandidate: CandidateProfile & {
          hasMatch?: boolean;
          hasApplication?: boolean;
        } = {
          ...candidate, // Use application data as base (has more complete info)
          status: finalStatus,
          statusLabel:
            finalStatus === 'matched' ? 'Matched' : candidate.statusLabel,
          // Preserve match percentage from match if not in application
          matchPercentage:
            candidate.matchPercentage || matchingMatch.matchPercentage,
          // Track that this candidate has both match and application
          hasMatch: true,
          hasApplication: true,
        };
        candidateMap.set(uniqueKey, mergedCandidate);
      } else {
        // No match, just use the application
        candidateMap.set(uniqueKey, {
          ...candidate,
          hasApplication: true,
          hasMatch: false,
        });
      }
    });

    // Add matches that don't have corresponding applications (only if we should include matches)
    if (shouldIncludeMatches) {
      matchCandidates.forEach((candidate) => {
        const uniqueKey =
          candidate.jobId && candidate.name
            ? `${candidate.jobId}-${candidate.name}`
            : String(candidate.id);

        if (!candidateMap.has(uniqueKey)) {
          candidateMap.set(uniqueKey, {
            ...candidate,
            hasMatch: true,
            hasApplication: false,
          });
        }
      });
    }

    return Array.from(candidateMap.values());
  }, [applicationCandidates, matchCandidates, activeStatus]);

  // Extract error message
  const error = useMemo(() => {
    if (applicationsError || matchesError) {
      const err = (applicationsError || matchesError) as ApiError;
      return (
        err.response?.data?.message ||
        'Failed to load candidates. Please try again.'
      );
    }
    return null;
  }, [applicationsError, matchesError]);

  const loading = loadingApplications || loadingMatches;

  // Get unique jobs from all candidates (fetch from a separate query if needed, or use current data)
  // For now, we'll get jobs from the fetched candidates
  const availableJobs = useMemo(() => {
    const jobMap = new Map<string, { id: string; title: string }>();
    candidates.forEach((candidate) => {
      if (candidate.jobId && candidate.jobTitle) {
        if (!jobMap.has(candidate.jobId)) {
          jobMap.set(candidate.jobId, {
            id: candidate.jobId,
            title: candidate.jobTitle,
          });
        }
      }
    });
    return Array.from(jobMap.values());
  }, [candidates]);

  // Filter candidates by status only (search and jobId are handled by backend)
  // Note: 'matched' and 'pending' statuses need client-side filtering due to complex mapping
  const filteredCandidates = useMemo(() => {
    let filtered = candidates;

    // Filter by status (only for complex mappings that backend doesn't handle)
    if (activeStatus !== 'all') {
      if (activeStatus === 'matched') {
        // Show candidates that have a match (regardless of whether they also have an application)
        filtered = filtered.filter(
          (
            candidate
          ): candidate is CandidateProfile & {
            hasMatch: boolean;
            hasApplication?: boolean;
          } => {
            const extended = candidate as CandidateProfile & {
              hasMatch?: boolean;
              hasApplication?: boolean;
            };
            return extended.hasMatch === true;
          }
        );
      } else if (activeStatus === 'pending') {
        // 'pending' is a special case (offer_sent), filter client-side
        filtered = filtered.filter(
          (candidate: CandidateProfile) => candidate.status === 'pending'
        );
      } else if (activeStatus === 'applied') {
        // Show candidates that have an application (regardless of whether they also have a match)
        filtered = filtered.filter(
          (
            candidate
          ): candidate is CandidateProfile & {
            hasMatch?: boolean;
            hasApplication: boolean;
          } => {
            const extended = candidate as CandidateProfile & {
              hasMatch?: boolean;
              hasApplication?: boolean;
            };
            return extended.hasApplication === true;
          }
        );
      } else if (activeStatus === 'hired') {
        // 'hired' is filtered by backend, but ensure we only show candidates with status='hired'
        // This prevents matches from showing up when filtering by hired
        filtered = filtered.filter(
          (candidate: CandidateProfile) => candidate.status === 'hired'
        );
      }
    }

    return filtered;
  }, [candidates, activeStatus]);

  const handlePreview = (candidate: CandidateProfile) => {
    setSelectedCandidate(candidate);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCandidate(null);
  };

  useEffect(() => {
    if (!id) return;
    if (candidates.length === 0) return;

    const candidate = candidates.find((c) => c.id?.toString() === id);

    if (candidate) {
      setSelectedCandidate(candidate);
      setIsModalOpen(true);

      setTimeout(() => {
        navigate('/candidates', { replace: true });
      }, 300);
    }
  }, [id, candidates, navigate]);

  // Mutation for suggesting multiple time slots
  const suggestTimeSlotsMutation = useMutation({
    mutationFn: async ({
      applicationId,
      timeSlots,
      companyTimezone,
      selectionDeadline,
    }: {
      applicationId: string;
      timeSlots: Array<{ date: string; duration: number }>;
      companyTimezone: string;
      selectionDeadline?: string;
    }) => {
      return companyApi.suggestTimeSlots({
        applicationId,
        timeSlots,
        companyTimezone,
        selectionDeadline,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyApplications'] });
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['companyCandidates'] });
      setIsMultiSlotModalOpen(false);
      setMultiSlotCandidate(null);
    },
  });

  // Handler for submitting multiple time slots
  const handleSubmitTimeSlots = useCallback(
    async (
      candidate: CandidateProfile,
      timeSlots: Array<{ date: string; duration: number }>,
      companyTimezone: string,
      selectionDeadline?: string
    ) => {
      if (!candidate.applicationId) {
        throw new Error('Missing application reference for this candidate.');
      }
      await suggestTimeSlotsMutation.mutateAsync({
        applicationId: candidate.applicationId,
        timeSlots,
        companyTimezone,
        selectionDeadline,
      });
    },
    [suggestTimeSlotsMutation]
  );

  const handleViewCV = (candidate: CandidateProfile) => {
    const resume = candidate.cv;
    if (!resume) {
      console.warn('No resume available for candidate', candidate.id);
      return;
    }

    // Handle both string URL and object with fileUrl property
    const url =
      typeof resume === 'string' ? resume : (resume as any)?.fileUrl || resume;

    if (!url) {
      console.warn('Resume missing URL', resume);
      return;
    }

    // Open the resume URL in a new tab
    window.open(url, '_blank', 'noopener,noreferrer');
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
        <div className="flex flex-col gap-[16px] mb-[24px]">
          <div className="flex items-center gap-[12px] justify-end">
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
          </div>

          {/* Filter Pills */}
          <div className="flex gap-[10px] flex-wrap justify-end">
            <button
              type="button"
              onClick={() => setActiveStatus('all')}
              className={`flex items-center gap-[8px] px-[18px] py-[10px] rounded-[9px] border text-[14px] font-medium transition ${
                activeStatus === 'all'
                  ? 'border-button bg-[#DBFFC0] text-[#1C1C1C]'
                  : 'border-[#E5E7EB] bg-white text-[#1C1C1C80] hover:border-[#C5D2BF]'
              }`}
            >
              All
            </button>
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

        {/* Candidates Grid - Grouped by Job */}
        {!loading && (
          <>
            {filteredCandidates.length > 0 ? (
              selectedJobId === 'all' ? (
                // Grouped view when showing all jobs
                <div className="flex flex-col gap-[32px]">
                  {availableJobs.map((job) => {
                    const jobCandidates = filteredCandidates.filter(
                      (c) => c.jobId === job.id
                    );
                    if (jobCandidates.length === 0) return null;

                    return (
                      <div key={job.id} className="flex flex-col gap-[16px]">
                        <div className="flex items-center gap-[12px] pb-[8px] border-b border-fade">
                          <h2 className="text-[20px] font-semibold text-[#1C1C1C]">
                            {job.title}
                          </h2>
                          <span className="px-[12px] py-[4px] rounded-full bg-[#F8F8F8] text-[12px] font-medium text-[#1C1C1C80]">
                            {jobCandidates.length}{' '}
                            {jobCandidates.length === 1
                              ? 'candidate'
                              : 'candidates'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-[20px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {jobCandidates.map((candidate: CandidateProfile) => (
                            <CandidateCard
                              key={candidate.id}
                              candidate={candidate}
                              onPreview={handlePreview}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {/* Show candidates without job ID at the end */}
                  {(() => {
                    const noJobCandidates = filteredCandidates.filter(
                      (c) => !c.jobId
                    );
                    if (noJobCandidates.length === 0) return null;

                    return (
                      <div className="flex flex-col gap-[16px]">
                        <div className="flex items-center gap-[12px] pb-[8px] border-b border-fade">
                          <h2 className="text-[20px] font-semibold text-[#1C1C1C]">
                            Other Candidates
                          </h2>
                          <span className="px-[12px] py-[4px] rounded-full bg-[#F8F8F8] text-[12px] font-medium text-[#1C1C1C80]">
                            {noJobCandidates.length}{' '}
                            {noJobCandidates.length === 1
                              ? 'candidate'
                              : 'candidates'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-[20px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {noJobCandidates.map(
                            (candidate: CandidateProfile) => (
                              <CandidateCard
                                key={candidate.id}
                                candidate={candidate}
                                onPreview={handlePreview}
                              />
                            )
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                // Single job view when filtered
                <div className="grid grid-cols-1 gap-[20px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredCandidates.map((candidate: CandidateProfile) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      onPreview={handlePreview}
                    />
                  ))}
                </div>
              )
            ) : (
              <EmptyState
                title={
                  searchQuery ||
                  activeStatus !== 'all' ||
                  selectedJobId !== 'all'
                    ? 'No candidates found'
                    : 'No candidates yet'
                }
                description={
                  searchQuery ||
                  activeStatus !== 'all' ||
                  selectedJobId !== 'all'
                    ? 'Try adjusting your search or filters to discover more candidates.'
                    : 'Candidates will appear here once they apply to your job postings.'
                }
              />
            )}
          </>
        )}
      </div>

      <CandidatePreviewModal
        isOpen={isModalOpen}
        candidate={selectedCandidate}
        onClose={handleCloseModal}
        onViewCV={handleViewCV}
      />

      {/* Multi-Slot Scheduling Modal */}
      <ScheduleInterviewModal
        isOpen={isMultiSlotModalOpen}
        candidate={multiSlotCandidate}
        onClose={() => {
          setIsMultiSlotModalOpen(false);
          setMultiSlotCandidate(null);
        }}
        onSchedule={handleSubmitTimeSlots}
        isScheduling={suggestTimeSlotsMutation.isPending}
      />
    </div>
  );
};

export default CompanyCandidates;
