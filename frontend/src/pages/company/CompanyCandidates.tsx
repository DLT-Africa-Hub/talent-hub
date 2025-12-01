import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BsSearch } from 'react-icons/bs';
import CandidateCard from '../../components/company/CandidateCard';
import CandidatePreviewModal from '../../components/company/CandidatePreviewModal';
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
import { EmptyState } from '../../components/ui';
import { MdFilterList } from 'react-icons/md';

const CompanyCandidates = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<CandidateStatus | 'all'>(
    'all'
  );
  const [selectedJobId, setSelectedJobId] = useState<string | 'all'>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        applicationId: app._id?.toString(),
        jobId: job._id?.toString() || job.id?.toString(),
        jobTitle: job.title,
        name: fullName || 'Unknown Candidate',
        role: job.title || graduate.position || 'Developer',
        status: candidateStatus,
        rank: getCandidateRank(graduate.rank),
        statusLabel:
          candidateStatus.charAt(0).toUpperCase() + candidateStatus.slice(1),
        experience: formatExperience(graduate.expYears || 0),
        location: formatLocation(job.location || graduate.location),
        skills: (graduate.skills || []).slice(0, 3),
        image: graduate.profilePictureUrl || DEFAULT_PROFILE_IMAGE,
        summary: graduate.summary,
        cv: app.resume,
        matchPercentage: app.matchId?.score
          ? app.matchId.score > 1
            ? Math.min(100, Math.round(app.matchId.score))
            : Math.min(100, Math.round(app.matchId.score * 100))
          : undefined,
        jobType: job.jobType,
        salary: job.salary,
        directContact: job.directContact !== false, // Default to true
      };
    },
    []
  );

  

  // Transform API match to CandidateProfile using useCallback
  const transformMatch = useCallback(
    (match: any, index: number): CandidateProfile => {
      const graduate = match.graduateId || {};
      const job = match.jobId || {};

      const fullName = `${graduate.firstName || ''} ${
        graduate.lastName || ''
      }`.trim();

      const matchScore = match.score > 1
        ? Math.min(100, Math.round(match.score))
        : Math.min(100, Math.round(match.score * 100));

      return {
        id: match._id || `match-${index}`,
        jobId: job._id?.toString() || job.id?.toString(),
        jobTitle: job.title,
        name: fullName || 'Unknown Candidate',
        role: job.title || graduate.position || 'Developer',
        status: 'matched',
        rank: getCandidateRank(graduate.rank),
        statusLabel: 'Matched',
        experience: formatExperience(graduate.expYears || 0),
        location: formatLocation(job.location || graduate.location),
        skills: (graduate.skills || []).slice(0, 3),
        image: graduate.profilePictureUrl || DEFAULT_PROFILE_IMAGE,
        summary: graduate.summary,
        cv: graduate.cv,
        matchPercentage: matchScore,
        jobType: job.jobType,
        salary: job.salary,
        directContact: job.directContact !== false, // Default to true
      };
    },
    []
  );

  // Fetch applications using React Query
  const {
    data: applicationsResponse,
    isLoading: loadingApplications,
    error: applicationsError,
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

  // Fetch matches using React Query
  const {
    data: matchesResponse,
    isLoading: loadingMatches,
    error: matchesError,
  } = useQuery({
    queryKey: ['companyMatches'],
    queryFn: async () => {
      const response = await companyApi.getAllMatches({
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

  // Extract matches array from response
  const matchesData = useMemo(() => {
    if (!matchesResponse) return [];
    if (Array.isArray(matchesResponse)) {
      return matchesResponse;
    }
    if (
      matchesResponse?.matches &&
      Array.isArray(matchesResponse.matches)
    ) {
      return matchesResponse.matches;
    }
    return [];
  }, [matchesResponse]);

  // Transform applications to candidates using useMemo
  const applicationCandidates = useMemo(() => {
    if (!applicationsData || !Array.isArray(applicationsData)) return [];
    console.log(applicationsData)
    return applicationsData.map((app: any, index: number) =>
      transformApplication(app, index)
    );
  }, [applicationsData, transformApplication]);

  // Transform matches to candidates using useMemo
  const matchCandidates = useMemo(() => {
    if (!matchesData || !Array.isArray(matchesData)) return [];
    return matchesData.map((match: any, index: number) =>
      transformMatch(match, index)
    );
  }, [matchesData, transformMatch]);

  // Combine candidates, avoiding duplicates (prefer applications over matches)
  const candidates = useMemo(() => {
    const candidateMap = new Map<string | number, CandidateProfile>();
    
    // Add matches first
    matchCandidates.forEach((candidate) => {
      const key = typeof candidate.id === 'string' && candidate.id.startsWith('match-')
        ? `match-${candidate.name}-${candidate.role}`
        : candidate.id;
      if (!candidateMap.has(key)) {
        candidateMap.set(key, candidate);
      }
    });

    // Add applications (they take precedence)
    applicationCandidates.forEach((candidate) => {
      candidateMap.set(candidate.id, candidate);
    });

    return Array.from(candidateMap.values());
  }, [applicationCandidates, matchCandidates]);

  // Extract error message
  const error = useMemo(() => {
    if (applicationsError || matchesError) {
      const err = (applicationsError || matchesError) as any;
      return (
        err.response?.data?.message ||
        'Failed to load candidates. Please try again.'
      );
    }
    return null;
  }, [applicationsError, matchesError]);

  const loading = loadingApplications || loadingMatches;

  // Get unique jobs from candidates
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


  const filteredCandidates = useMemo(() => {
    let filtered = candidates;

    // Filter by job
    if (selectedJobId !== 'all') {
      filtered = filtered.filter(
        (candidate: CandidateProfile) => candidate.jobId === selectedJobId
      );
    }

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
          candidate.location.toLowerCase().includes(query) ||
          candidate.jobTitle?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [candidates, selectedJobId, activeStatus, searchQuery]);

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
  
    const candidate = candidates.find(c => c.id?.toString() === id);
  
    if (candidate) {
      setSelectedCandidate(candidate);
      setIsModalOpen(true);
  
     
      setTimeout(() => {
        navigate("/candidates", { replace: true });
      }, 300); 
    }
  }, [id, candidates]);
  
  

  const handleChat = (candidate: CandidateProfile) => {
    // TODO: Navigate to chat
    console.log('Chat clicked for candidate:', candidate.id);
  };

  const scheduleInterviewMutation = useMutation({
    mutationFn: async ({
      applicationId,
      scheduledAt,
      durationMinutes,
    }: {
      applicationId: string;
      scheduledAt: string;
      durationMinutes?: number;
    }) => {
      return companyApi.scheduleInterview(applicationId, {
        scheduledAt,
        durationMinutes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyApplications'] });
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['interviews', 'company'] });
      queryClient.invalidateQueries({ queryKey: ['companyCandidates'] });
    },
  });

  const updateApplicationStatusMutation = useMutation({
    mutationFn: async ({
      applicationId,
      status,
      notes,
    }: {
      applicationId: string;
      status: string;
      notes?: string;
    }) => {
      return companyApi.updateApplicationStatus(applicationId, status, notes);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['companyApplications'] });
      queryClient.invalidateQueries({ queryKey: ['companyCandidates'] });
      // If status is 'accepted', navigate to messages
      if (variables.status === 'accepted') {
        navigate('/messages');
      }
    },
  });

  const handleScheduleInterview = useCallback(
    async (
      candidate: CandidateProfile,
      scheduledAt: string,
      durationMinutes?: number
    ) => {
      if (!candidate.applicationId) {
        throw new Error('Missing application reference for this candidate.');
      }
      await scheduleInterviewMutation.mutateAsync({
        applicationId: candidate.applicationId,
        scheduledAt,
        durationMinutes,
      });
    },
    [scheduleInterviewMutation]
  );

  const handleAccept = useCallback(
    (candidate: CandidateProfile) => {
      if (!candidate.applicationId) {
        throw new Error('Missing application reference for this candidate.');
      }
      updateApplicationStatusMutation.mutate({
        applicationId: candidate.applicationId,
        status: 'accepted',
      });
    },
    [updateApplicationStatusMutation]
  );

  const handleReject = useCallback(
    (candidate: CandidateProfile) => {
      if (!candidate.applicationId) {
        throw new Error('Missing application reference for this candidate.');
      }
      updateApplicationStatusMutation.mutate({
        applicationId: candidate.applicationId,
        status: 'rejected',
      });
    },
    [updateApplicationStatusMutation]
  );

  const handleViewCV = (candidate: CandidateProfile) => {
    const resume = candidate.cv;
    if (!resume) {
      console.warn('No resume available for candidate', candidate.id);
      return;
    }
  
    // Handle both string URL and object with fileUrl property
    const url = typeof resume === 'string' 
      ? resume 
      : (resume as any)?.fileUrl || resume;
    
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
            <button
              type="button"
              className=" w-[50px] p-[10px] rounded-[14px] border border-[#DCE5D5] bg-white text-[#1C1C1C] flex items-center justify-center hover:border-button hover:text-button transition"
            >
              <MdFilterList className="text-[20px]" />
            </button>
          </div>

          {/* Job Filter Dropdown */}
          {availableJobs.length > 0 && (
            <div className="flex items-center gap-[12px] justify-end">
              <label className="text-[14px] font-medium text-[#1C1C1C]">
                Filter by Job:
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="px-[16px] py-[10px] rounded-[10px] border border-[#DCE5D5] bg-white text-[14px] text-[#1C1C1C] focus:outline-none focus:border-button transition min-w-[250px]"
              >
                <option value="all">All Jobs</option>
                {availableJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                            {jobCandidates.length} {jobCandidates.length === 1 ? 'candidate' : 'candidates'}
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
                            {noJobCandidates.length} {noJobCandidates.length === 1 ? 'candidate' : 'candidates'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-[20px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {noJobCandidates.map((candidate: CandidateProfile) => (
                            <CandidateCard
                              key={candidate.id}
                              candidate={candidate}
                              onPreview={handlePreview}
                            />
                          ))}
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
                  searchQuery || activeStatus !== 'all' || selectedJobId !== 'all'
                    ? 'No candidates found'
                    : 'No candidates yet'
                }
                description={
                  searchQuery || activeStatus !== 'all' || selectedJobId !== 'all'
                    ? 'Try adjusting your search or filters to discover more candidates.'
                    : 'Candidates will appear here once they apply to your job postings.'
                }
              />
            )}
          </>
        )}
      </div>

      {/* Candidate Preview Modal */}
      <CandidatePreviewModal
        isOpen={isModalOpen}
        candidate={selectedCandidate}
        onClose={handleCloseModal}
        onChat={handleChat}
        onViewCV={handleViewCV}
        onScheduleInterview={handleScheduleInterview}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    </div>
  );
};

export default CompanyCandidates;
