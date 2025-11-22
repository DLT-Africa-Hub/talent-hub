import { HiOutlineBriefcase } from 'react-icons/hi';
import { CandidateProfile } from '../../data/candidates';
import BaseModal from '../ui/BaseModal';
import { ActionButtonGroup } from '../ui';
import { formatJobType, formatSalaryRange, getSalaryType } from '../../utils/job.utils';

interface CandidatePreviewModalProps {
  isOpen: boolean;
  candidate: CandidateProfile | null;
  onClose: () => void;
  onChat?: (candidate: CandidateProfile) => void;
  onViewCV?: (candidate: CandidateProfile) => void;
}

const CandidatePreviewModal: React.FC<CandidatePreviewModalProps> = ({
  isOpen,
  candidate,
  onClose,
  onChat,
  onViewCV,
}) => {
  if (!candidate) return null;

  const matchPercentage = candidate.matchPercentage ?? undefined;
  const summary = candidate.summary || 'No summary available.';
  
  // Format job details
  const jobType = candidate.jobType ? formatJobType(candidate.jobType) : 'Not specified';
  const salaryRange = formatSalaryRange(candidate.salary);
  const salaryType = candidate.jobType ? getSalaryType(candidate.jobType) : 'Annual';
  const locationParts = candidate.location ? candidate.location.split(' • ') : [];
  const locationCity = locationParts.length > 1 ? locationParts[1] : candidate.location || 'Not specified';
  const locationType = locationParts.length > 0 ? locationParts[0] : '';

  const handleChat = () => {
    onChat?.(candidate);
    onClose();
  };

  const handleViewCV = () => {
    if (candidate.cv) {
      // Open CV in new tab if URL is provided
      window.open(candidate.cv, '_blank');
    }
    onViewCV?.(candidate);
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="md">
      {/* Candidate Photo */}
      <div className="relative h-[200px] w-[200px] overflow-hidden rounded-[16px]">
        <img
          src={candidate.image}
          alt={candidate.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute left-[14px] top-[14px] flex h-[44px] w-[44px] items-center justify-center rounded-full border border-white/40 bg-white/30 backdrop-blur-sm text-white">
          <HiOutlineBriefcase className="text-[22px]" />
        </div>
      </div>

      {/* Candidate Information */}
      <div className="flex flex-col gap-[16px]">
        <div className="flex items-start justify-between gap-[16px]">
          <div className="flex flex-col gap-[4px]">
            <h2 className="text-[28px] font-semibold text-[#1C1C1C]">
              {candidate.name}
            </h2>
            <p className="font-sf text-[18px] text-[#1C1C1CBF]">
              {candidate.role}
            </p>
          </div>
          <div className="flex items-center gap-[8px] rounded-full bg-[#E2F4DA] px-[14px] py-[8px]">
            <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-button text-[14px] font-semibold text-white">
              {candidate.rank}
            </span>
            {matchPercentage !== undefined && (
              <span className="text-[16px] font-semibold text-button">
                {matchPercentage}% match
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        <p className="text-[16px] leading-relaxed text-[#1C1C1CBF]">
          {summary}
        </p>

        {/* Skills */}
        <div className="flex flex-wrap gap-[12px]">
          {candidate.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-fade bg-[#F8F8F8] px-[16px] py-[8px] text-[14px] font-medium text-[#1C1C1C]"
            >
              {skill}
            </span>
          ))}
        </div>

        {/* Employment Details */}
        <div className="flex items-center gap-[16px] border-t border-[#E0E0E0] pt-[20px]">
          <div className="flex flex-col">
            <span className="text-[18px] font-semibold text-[#1C1C1C]">
              {candidate.experience}
            </span>
            <span className="text-[14px] text-[#1C1C1CBF]">{jobType}</span>
          </div>
          <div className="h-[40px] w-px bg-[#E0E0E0]" />
          <div className="flex flex-col">
            <span className="text-[18px] font-semibold text-[#1C1C1C]">
              {locationType || locationCity.split(',')[0]}
            </span>
            <span className="text-[14px] text-[#1C1C1CBF]">
              {locationType ? locationCity : 'Location'}
            </span>
          </div>
          <div className="h-[40px] w-px bg-[#E0E0E0]" />
          <div className="flex flex-col">
            <span className="text-[18px] font-semibold text-[#1C1C1C]">
              {salaryRange === 'Not specified' ? '—' : salaryRange.replace(/[k$]/g, '')}
            </span>
            <span className="text-[14px] text-[#1C1C1CBF]">{salaryType}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-[8px]">
          <ActionButtonGroup
            secondary={{
              label: 'Chat',
              onClick: handleChat,
            }}
            primary={{
              label: 'View CV',
              onClick: handleViewCV,
            }}
          />
        </div>
      </div>
    </BaseModal>
  );
};

export default CandidatePreviewModal;
