import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { HiOutlineEye } from 'react-icons/hi2';
import BaseModal from '../ui/BaseModal';
import CandidatePreviewModal from './CandidatePreviewModal';
import { companyApi } from '../../api/company';
import { CandidateProfile } from '../../data/candidates';
import {
  formatExperience,
  formatLocation,
  getCandidateRank,
  DEFAULT_PROFILE_IMAGE,
} from '../../utils/job.utils';
import { InlineLoader, EmptyState, ImageWithFallback } from '../ui';

interface JobMatchesModalProps {
  isOpen: boolean;
  jobId: string | null;
  jobTitle?: string;
  onClose: () => void;
}

const JobMatchesModal: React.FC<JobMatchesModalProps> = ({
  isOpen,
  jobId,
  jobTitle,
  onClose,
}) => {
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Fetch matches for the job
  const {
    data: matchesResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['jobMatches', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const response = await companyApi.getJobMatches(jobId, {
        page: 1,
        limit: 100,
      });
      return response;
    },
    enabled: isOpen && !!jobId,
  });

  // Transform match to CandidateProfile
  const transformMatch = (match: any, index: number): CandidateProfile => {
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
    };
  };

  const matches = matchesResponse?.matches || [];
  const candidates = matches.map((match: any, index: number) =>
    transformMatch(match, index)
  );

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

  return (
    <>
      <BaseModal isOpen={isOpen} onClose={onClose} size="xl">
        <div className="flex flex-col gap-[24px]">
          {/* Header */}
          <div className="flex flex-col gap-[8px]">
            <h2 className="text-[24px] font-semibold text-[#1C1C1C]">
              Matched Candidates
            </h2>
            {jobTitle && (
              <p className="text-[16px] text-[#1C1C1CBF]">
                {jobTitle}
              </p>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="py-[60px]">
              <InlineLoader message="Loading matches..." />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="py-[60px]">
              <EmptyState
                title="Failed to load matches"
                description="Please try again later."
              />
            </div>
          )}

          {/* Matches List - Landscape Table */}
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
                        <th className="px-[16px] py-[12px] text-left text-[14px] font-semibold text-[#1C1C1C]">
                          Location
                        </th>
                        <th className="px-[16px] py-[12px] text-center text-[14px] font-semibold text-[#1C1C1C]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((candidate: CandidateProfile, index: number) => (
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
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No matches yet"
                  description="Candidates will appear here once they're matched with this job posting."
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
      />
    </>
  );
};

export default JobMatchesModal;

