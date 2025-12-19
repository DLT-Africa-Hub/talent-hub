import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useCallback } from 'react';
import { HiOutlineEye } from 'react-icons/hi2';
import BaseModal from '../ui/BaseModal';
import CandidatePreviewModal from './CandidatePreviewModal';
import { companyApi } from '../../api/company';
import { CandidateProfile } from '../../types/candidates';
import {
  formatExperience,
  formatLocation,
  getCandidateRank,
  DEFAULT_PROFILE_IMAGE,
  mapApplicationStatusToCandidateStatus,
} from '../../utils/job.utils';
import { InlineLoader, EmptyState, ImageWithFallback } from '../ui';
import { ApiMatch, ApiApplication } from '../../types/api';

export type CandidatesListType = 'matches' | 'applicants';

interface CandidatesListModalProps {
  isOpen: boolean;
  jobId: string | null;
  jobTitle?: string;
  type: CandidatesListType;
  onClose: () => void;
}

const CandidatesListModal: React.FC<CandidatesListModalProps> = ({
  isOpen,
  jobId,
  jobTitle,
  type,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateProfile | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Determine query key and fetch function based on type
  const queryKey = useMemo(() => {
    return type === 'matches'
      ? ['jobMatches', jobId]
      : ['jobApplicants', jobId];
  }, [type, jobId]);

  const fetchFunction = useMemo(() => {
    return async () => {
      if (!jobId) return null;

      if (type === 'matches') {
        const response = await companyApi.getJobMatches(jobId, {
          page: 1,
          limit: 100,
        });
        return response;
      } else {
        const response = await companyApi.getApplications({
          page: 1,
          limit: 100,
          jobId: jobId,
        });
        return response;
      }
    };
  }, [type, jobId]);

  // Fetch candidates
  const {
    data: responseData,
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: fetchFunction,
    enabled: isOpen && !!jobId,
  });

  // Fetch Calendly status
  const { data: calendlyStatus } = useQuery({
    queryKey: ['calendlyStatus'],
    queryFn: async () => {
      const response = await companyApi.getCalendlyStatus();
      return response;
    },
  });

  // Transform match to CandidateProfile
  const transformMatch = useCallback(
    (match: ApiMatch, index: number): CandidateProfile => {
      const graduate = match.graduateId || {};
      const job = match.jobId || {};

      const fullName = `${graduate.firstName || ''} ${
        graduate.lastName || ''
      }`.trim();

      const matchScore = match.score
        ? match.score > 1
          ? Math.min(100, Math.round(match.score))
          : Math.min(100, Math.round(match.score * 100))
        : 0;

      // Get first position if array, otherwise use as string
      const position = Array.isArray(graduate.position)
        ? graduate.position[0]
        : graduate.position;

      // Get CV from graduate - handle different formats
      let cvUrl: string | undefined;
      if (graduate.cv) {
        // If it's a string, use it directly
        if (typeof graduate.cv === 'string') {
          cvUrl = graduate.cv;
        }
        // If it's an array, find the display CV or use the first one
        else if (Array.isArray(graduate.cv) && graduate.cv.length > 0) {
          const displayCV = graduate.cv.find(
            (cv: { onDisplay?: boolean; fileUrl?: string }) => cv.onDisplay
          );
          cvUrl = displayCV?.fileUrl || graduate.cv[0]?.fileUrl;
        }
        // If it's an object with fileUrl
        else if (typeof graduate.cv === 'object' && 'fileUrl' in graduate.cv) {
          cvUrl = (graduate.cv as { fileUrl?: string }).fileUrl;
        }
      }

      return {
        id: match._id || `match-${index}`,
        name: fullName || 'Unknown Candidate',
        role: job.title || position || 'Developer',
        status: 'matched',
        rank: getCandidateRank(graduate.rank),
        statusLabel: 'Matched',
        experience: formatExperience(graduate.expYears || 0),
        location: formatLocation(job.location || graduate.location),
        skills: (graduate.skills || []).slice(0, 3),
        image: graduate.profilePictureUrl || DEFAULT_PROFILE_IMAGE,
        summary: graduate.summary,
        cv: cvUrl,
        matchPercentage: matchScore,
        jobType: job.jobType,
        salary: job.salary,
      };
    },
    []
  );

  // Transform application to CandidateProfile
  const transformApplication = useCallback(
    (application: ApiApplication, index: number): CandidateProfile => {
      const graduate = application.graduateId || {};
      const job = application.jobId || {};
      const company = job.companyId || {};

      const fullName = `${graduate.firstName || ''} ${
        graduate.lastName || ''
      }`.trim();

      const candidateStatus = mapApplicationStatusToCandidateStatus(
        application.status || ''
      );

      const matchScore = application.matchId?.score
        ? application.matchId.score > 1
          ? Math.min(100, Math.round(application.matchId.score))
          : Math.min(100, Math.round(application.matchId.score * 100))
        : undefined;

      // Get CV from graduate or application resume
      let cvUrl: string | undefined;
      if (graduate.cv && Array.isArray(graduate.cv) && graduate.cv.length > 0) {
        const displayCV = graduate.cv.find(
          (cv: { onDisplay?: boolean; fileUrl?: string }) => cv.onDisplay
        );
        cvUrl = displayCV?.fileUrl || graduate.cv[0]?.fileUrl;
      }
      if (!cvUrl && application.resume?.fileUrl) {
        cvUrl = application.resume.fileUrl;
      }

      // Get first position if array, otherwise use as string
      const position = Array.isArray(graduate.position)
        ? graduate.position[0]
        : graduate.position;

      return {
        id: application._id || `application-${index}`,
        applicationId: application._id?.toString(),
        jobId: application.jobId?._id?.toString() || jobId || '',
        jobTitle: job.title,
        companyName: company.companyName,
        name: fullName || 'Unknown Candidate',
        role: position || 'Developer',
        status: candidateStatus,
        rank: getCandidateRank(graduate.rank),
        statusLabel:
          (application.status || '').charAt(0).toUpperCase() +
          (application.status || '').slice(1),
        experience: formatExperience(graduate.expYears || 0),
        location: formatLocation(job.location || graduate.location),
        skills: (graduate.skills || []).slice(0, 3),
        image: graduate.profilePictureUrl || DEFAULT_PROFILE_IMAGE,
        summary: graduate.summary,
        cv: cvUrl,
        matchPercentage: matchScore,
        jobType: job.jobType,
        salary: job.salary,
        directContact: job.directContact,
      };
    },
    [jobId]
  );

  // Get candidates based on type
  const candidates = useMemo(() => {
    if (!responseData) return [];

    if (type === 'matches') {
      const matches = responseData.matches || [];
      return matches.map((match: ApiMatch, index: number) =>
        transformMatch(match, index)
      );
    } else {
      const applications = responseData.applications || [];
      return applications.map((application: ApiApplication, index: number) =>
        transformApplication(application, index)
      );
    }
  }, [responseData, type, transformMatch, transformApplication]);

  // Modal configuration based on type
  const modalConfig = useMemo(() => {
    if (type === 'matches') {
      return {
        title: 'Matched Candidates',
        loadingMessage: 'Loading matches...',
        errorTitle: 'Failed to load matches',
        emptyTitle: 'No matches yet',
        emptyDescription:
          "Candidates will appear here once they're matched with this job posting.",
      };
    } else {
      return {
        title: 'Applicants',
        loadingMessage: 'Loading applicants...',
        errorTitle: 'Failed to load applicants',
        emptyTitle: 'No applicants yet',
        emptyDescription:
          'Candidates will appear here once they apply to this job posting.',
      };
    }
  }, [type]);

  const handlePreview = (candidate: CandidateProfile) => {
    setSelectedCandidate(candidate);
    setIsPreviewModalOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewModalOpen(false);
    setSelectedCandidate(null);
  };

  const handleChat = (candidate: CandidateProfile) => {
    // TODO: Navigate to chat
    console.log('Chat clicked for candidate:', candidate.id);
  };

  const handleViewCV = (candidate: CandidateProfile) => {
    // Already handled in CandidatePreviewModal
    console.log('View CV clicked for candidate:', candidate.id);
  };

  // Mutation for updating application status (accept/reject)
  const updateApplicationStatusMutation = useMutation({
    mutationFn: async ({
      applicationId,
      status,
    }: {
      applicationId: string;
      status: string;
    }) => {
      return companyApi.updateApplicationStatus(applicationId, status);
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['jobApplicants', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobMatches', jobId] });
      queryClient.invalidateQueries({ queryKey: ['companyApplications'] });
      queryClient.invalidateQueries({ queryKey: ['companyCandidates'] });
    },
  });

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

  return (
    <>
      <BaseModal isOpen={isOpen} onClose={onClose} size="xl">
        <div className="flex flex-col gap-[24px]">
          {/* Header */}
          <div className="flex flex-col gap-[8px]">
            <h2 className="text-[24px] font-semibold text-[#1C1C1C]">
              {modalConfig.title}
            </h2>
            {jobTitle && (
              <p className="text-[16px] text-[#1C1C1CBF]">{jobTitle}</p>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="py-[60px]">
              <InlineLoader message={modalConfig.loadingMessage} />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="py-[60px]">
              <EmptyState
                title={modalConfig.errorTitle}
                description="Please try again later."
              />
            </div>
          )}

          {/* Candidates List - Landscape Table */}
          {!isLoading && !error && (
            <>
              {candidates.length > 0 ? (
                <div className="max-h-[70vh] overflow-y-auto border border-fade rounded-[12px]">
                  <table className="w-full">
                    <thead className="bg-[#F8F8F8] sticky top-0 z-10">
                      <tr className="border-b border-fade">
                        <th className="px-[16px] py-[12px] text-left text-[14px] font-semibold text-[#1C1C1C]">
                          S/N
                        </th>
                        <th className="px-[16px] py-[12px] text-left text-[14px] font-semibold text-[#1C1C1C]">
                          Image
                        </th>
                        <th className="px-[16px] py-[12px] text-left text-[14px] font-semibold text-[#1C1C1C]">
                          Name
                        </th>
                        <th className="px-[16px] py-[12px] text-left text-[14px] font-semibold text-[#1C1C1C]">
                          Position
                        </th>
                        <th className="px-[16px] py-[12px] text-left text-[14px] font-semibold text-[#1C1C1C]">
                          Rank
                        </th>
                        {/* Status column only for applicants */}
                        {type === 'applicants' && (
                          <th className="px-[16px] py-[12px] text-left text-[14px] font-semibold text-[#1C1C1C]">
                            Status
                          </th>
                        )}
                        <th className="px-[16px] py-[12px] text-left text-[14px] font-semibold text-[#1C1C1C]">
                          Location
                        </th>
                        <th className="px-[16px] py-[12px] text-center text-[14px] font-semibold text-[#1C1C1C]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map(
                        (candidate: CandidateProfile, index: number) => (
                          <tr
                            key={candidate.id}
                            className="border-b border-fade hover:bg-[#F8F8F8] transition-colors"
                          >
                            <td className="px-[16px] py-[12px] text-[14px] text-[#1C1C1C]">
                              {index + 1}
                            </td>
                            <td className="px-[16px] py-[12px]">
                              <div className="w-[48px] h-[48px] rounded-[8px] overflow-hidden">
                                <ImageWithFallback
                                  src={candidate.image}
                                  alt={candidate.name}
                                  className="w-full h-full object-cover"
                                  fallback={DEFAULT_PROFILE_IMAGE}
                                />
                              </div>
                            </td>
                            <td className="px-[16px] py-[12px]">
                              <p className="text-[14px] font-medium text-[#1C1C1C]">
                                {candidate.name}
                              </p>
                            </td>
                            <td className="px-[16px] py-[12px]">
                              <p className="text-[14px] text-[#1C1C1CBF]">
                                {candidate.role}
                              </p>
                            </td>
                            <td className="px-[16px] py-[12px]">
                              <span className="inline-flex items-center justify-center w-[32px] h-[32px] rounded-full bg-button text-white text-[14px] font-semibold">
                                {candidate.rank}
                              </span>
                            </td>
                            {/* Status cell only for applicants */}
                            {type === 'applicants' && (
                              <td className="px-[16px] py-[12px]">
                                <span className="inline-block px-3 py-1 rounded-[20px] text-[12px] font-medium capitalize bg-[#F8F8F8] text-[#1C1C1C]">
                                  {candidate.statusLabel}
                                </span>
                              </td>
                            )}
                            <td className="px-[16px] py-[12px]">
                              <p className="text-[14px] text-[#1C1C1CBF]">
                                {candidate.location}
                              </p>
                            </td>
                            <td className="px-[16px] py-[12px]">
                              <button
                                type="button"
                                onClick={() => handlePreview(candidate)}
                                className="flex items-center justify-center gap-[8px] px-[16px] py-[8px] rounded-[8px] bg-button text-white text-[14px] font-medium hover:bg-[#176300] transition-colors"
                              >
                                <HiOutlineEye className="text-[16px]" />
                                <p className="text-[14px] font-medium">View</p>
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title={modalConfig.emptyTitle}
                  description={modalConfig.emptyDescription}
                />
              )}
            </>
          )}
        </div>
      </BaseModal>

      {/* Candidate Preview Modal */}
      <CandidatePreviewModal
        isOpen={isPreviewModalOpen}
        candidate={selectedCandidate}
        onClose={handleClosePreview}
        onChat={handleChat}
        onViewCV={handleViewCV}
        onAccept={selectedCandidate?.applicationId ? handleAccept : undefined}
        onReject={selectedCandidate?.applicationId ? handleReject : undefined}
        isAccepting={
          !!(
            updateApplicationStatusMutation.isPending &&
            selectedCandidate?.applicationId &&
            updateApplicationStatusMutation.variables?.status === 'accepted' &&
            updateApplicationStatusMutation.variables?.applicationId ===
              selectedCandidate.applicationId
          )
        }
        isRejecting={
          !!(
            updateApplicationStatusMutation.isPending &&
            selectedCandidate?.applicationId &&
            updateApplicationStatusMutation.variables?.status === 'rejected' &&
            updateApplicationStatusMutation.variables?.applicationId ===
              selectedCandidate.applicationId
          )
        }
        isCalendlyConnected={
          calendlyStatus?.connected && calendlyStatus?.enabled
        }
      />
    </>
  );
};

export default CandidatesListModal;
