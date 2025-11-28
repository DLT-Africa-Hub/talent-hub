import { useState, useMemo, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { companyApi } from '../../api/company';
import { LoadingSpinner } from '../../index';
import { EmptyState, SectionHeader } from '../../components/ui';
import CandidateCard from '../../components/company/CandidateCard';
import CandidatePreviewModal from '../../components/company/CandidatePreviewModal';
import { CandidateProfile } from '../../data/candidates';
import {
  mapApplicationStatusToCandidateStatus,
  formatExperience,
  formatLocation,
  getCandidateRank,
  DEFAULT_PROFILE_IMAGE,
} from '../../utils/job.utils';

const CompanyDashboard = () => {
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch matches (Matched Professionals)
  const { data: matchesResponse, isLoading: loadingMatches } = useQuery({
    queryKey: ['companyMatches'],
    queryFn: async () => {
      const response = await companyApi.getAllMatches({
        page: 1,
        limit: 100,
      });
      return response;
    },
  });

  // Fetch applications (Contract offers - those who applied)
  const { data: applicationsResponse, isLoading: loadingApplications } = useQuery({
    queryKey: ['companyApplications'],
    queryFn: async () => {
      const response = await companyApi.getApplications({
        page: 1,
        limit: 100,
      });
      return response;
    },
  });

  const scheduleInterviewMutation = useMutation({
    mutationFn: async ({
      applicationId,
      scheduledAt,
    }: {
      applicationId: string;
      scheduledAt: string;
    }) => {
      return companyApi.scheduleInterview(applicationId, {
        scheduledAt,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyApplications'] });
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['interviews', 'company'] });
    },
  });

  // Transform matches to candidate profiles
  const transformMatch = useCallback(
    (match: any, index: number): CandidateProfile => {
      const graduate = match.graduateId || {};
      const job = match.jobId || {};

      const fullName = `${graduate.firstName || ''} ${graduate.lastName || ''}`.trim();

      const matchScore = match.score > 1
        ? Math.min(100, Math.round(match.score))
        : Math.min(100, Math.round(match.score * 100));

      return {
        id: match._id || `match-${index}`,
        applicationId: match.applicationId || undefined,
        jobId: job._id?.toString?.() || job.id,
        jobTitle: job.title,
        companyName:
          (job.companyId &&
            typeof job.companyId === 'object' &&
            'companyName' in job.companyId &&
            (job.companyId as { companyName?: string }).companyName) ||
          undefined,
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

  // Transform applications to candidate profiles
  const transformApplication = useCallback(
    (app: any, index: number): CandidateProfile => {
      const graduate = app.graduateId || {};
      const job = app.jobId || {};

      const hasMatch = !!app.matchId;
      const candidateStatus = mapApplicationStatusToCandidateStatus(
        app.status,
        hasMatch
      );

      const fullName = `${graduate.firstName || ''} ${graduate.lastName || ''}`.trim();

      return {
        id: app._id || index,
        applicationId: app._id?.toString?.() || app.id,
        jobId: job._id?.toString?.() || job.id,
        jobTitle: job.title,
        companyName:
          (job.companyId &&
            typeof job.companyId === 'object' &&
            'companyName' in job.companyId &&
            (job.companyId as { companyName?: string }).companyName) ||
          undefined,
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
        cv: graduate.cv,
        matchPercentage: app.matchId?.score
          ? app.matchId.score > 1
            ? Math.min(100, Math.round(app.matchId.score))
            : Math.min(100, Math.round(app.matchId.score * 100))
          : undefined,
        jobType: job.jobType,
        salary: job.salary,
        directContact: job.directContact !== false, // Default to true
        interviewScheduledAt: app.interviewScheduledAt,
        interviewRoomSlug: app.interviewRoomSlug,
        interviewStatus: app.interviewScheduledAt ? 'scheduled' : undefined,
      };
    },
    []
  );

  // Extract and transform matches
  const matchesData = useMemo(() => {
    if (!matchesResponse) return [];
    if (Array.isArray(matchesResponse)) {
      return matchesResponse;
    }
    if (matchesResponse?.matches && Array.isArray(matchesResponse.matches)) {
      return matchesResponse.matches;
    }
    return [];
  }, [matchesResponse]);

  const matchedCandidates = useMemo(() => {
    if (!matchesData || !Array.isArray(matchesData)) return [];
    return matchesData.map((match: any, index: number) =>
      transformMatch(match, index)
    );
  }, [matchesData, transformMatch]);

  // Extract and transform applications
  const applicationsData = useMemo(() => {
    if (!applicationsResponse) return [];
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

  const applicationCandidates = useMemo(() => {
    if (!applicationsData || !Array.isArray(applicationsData)) return [];
    return applicationsData.map((app: any, index: number) =>
      transformApplication(app, index)
    );
  }, [applicationsData, transformApplication]);

  const loading = loadingMatches || loadingApplications;

  const handlePreview = (candidate: CandidateProfile) => {
    setSelectedCandidate(candidate);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCandidate(null);
  };

  const handleScheduleInterview = useCallback(
    async (candidate: CandidateProfile, scheduledAt: string) => {
      if (!candidate.applicationId) {
        throw new Error('Missing application reference for this candidate.');
      }
      await scheduleInterviewMutation.mutateAsync({
        applicationId: candidate.applicationId,
        scheduledAt,
      });
    },
    [scheduleInterviewMutation]
  );

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
        {/* Matched Professionals Section */}
        <div className="flex flex-col gap-[20px] mb-[40px]">
          <SectionHeader title="Matched Professionals" />
          {matchedCandidates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[20px]">
              {matchedCandidates.map((candidate: CandidateProfile) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  onPreview={handlePreview}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No matches yet"
              description="Candidates matched to your job postings will appear here."
              variant="minimal"
            />
          )}
        </div>

        {/* Contract Offers Section (Applications) */}
        <div className="flex flex-col gap-[20px]">
          <SectionHeader title="Contract offers" />
          {applicationCandidates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[20px]">
              {applicationCandidates.map((candidate: CandidateProfile) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  onPreview={handlePreview}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No applications yet"
              description="Applications from candidates will appear here."
              variant="minimal"
            />
          )}
        </div>
      </div>

      {/* Candidate Preview Modal */}
      <CandidatePreviewModal
        isOpen={isModalOpen}
        candidate={selectedCandidate}
        onClose={handleCloseModal}
        onScheduleInterview={handleScheduleInterview}
      />
    </DashboardLayout>
  );
};

export default CompanyDashboard;
