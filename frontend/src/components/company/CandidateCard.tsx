import { CiMail } from 'react-icons/ci';
import { HiOutlineBriefcase } from 'react-icons/hi';
import { CandidateProfile } from '../../data/candidates';
import {
  candidateStatusStyles,
  candidateRankBadgeStyles,
  formatSalaryPerAnnum,
} from '../../utils/job.utils';

interface CandidateCardProps {
  candidate: CandidateProfile;
  onPreview?: (candidate: CandidateProfile) => void;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  onPreview,
}) => {
  const handlePreview = () => {
    onPreview?.(candidate);
  };

  return (
    <article className="flex flex-col gap-[12px] rounded-[16px] border border-[#1B77001A] bg-[#FFFFFF] p-[16px] shadow-sm hover:shadow-md transition-shadow max-w-[320px] w-full">
      <div className="relative h-[180px] w-full overflow-hidden rounded-[12px]">
        <img
          src={candidate.image}
          alt={candidate.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute left-[12px] top-[12px] flex h-[36px] w-[36px] items-center justify-center rounded-full border border-white/40 bg-white/30 backdrop-blur-sm text-white text-[18px]">
          <HiOutlineBriefcase />
        </div>
      </div>

      <div className="flex items-start justify-between gap-[8px]">
        <div className="flex flex-col gap-[2px] min-w-0 flex-1">
          <p className="font-semibold text-[16px] text-[#1C1C1C] truncate">
            {candidate.name}
          </p>
          <p className="text-[13px] text-[#1C1C1CBF] truncate">
            {candidate.role}
          </p>
          {candidate.jobTitle && (
            <p className="text-[11px] text-[#1C1C1C80] truncate mt-[2px] flex items-center gap-1">
              <span className="font-medium">Job:</span>
              <span>{candidate.jobTitle}</span>
            </p>
          )}
        </div>
        <div
          className={`flex items-center gap-[6px] rounded-full px-[12px] py-[5px] text-[11px] font-medium shrink-0 ${candidateStatusStyles[candidate.status]}`}
        >
          <span
            className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] text-white font-semibold ${candidateRankBadgeStyles[candidate.status]}`}
          >
            {candidate.rank}
          </span>
          {candidate.statusLabel}
        </div>
      </div>

      <div className="flex flex-col gap-[10px] text-[12px] text-[#1C1C1CBF]">
        <div className="flex items-center justify-between gap-[8px]">
          <span className="font-medium text-[#1C1C1CE5]">
            {candidate.experience}
          </span>
          <span className="h-[14px] w-px bg-[#1C1C1C1A]" />
          <span className="text-right text-[11px] truncate flex-1">
            {candidate.location}
          </span>
        </div>
        {candidate.salaryPerAnnum && (
          <div className="text-[11px] font-medium text-[#1C1C1CE5]">
             {formatSalaryPerAnnum(candidate.salaryPerAnnum)}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-[8px] text-[11px] font-medium text-[#1C1C1CE5]">
          {candidate.skills.map((skill) => (
            <span
              key={skill}
              className="flex items-center justify-center rounded-full border border-[#D9E6C9] bg-[#F8F8F8] px-[10px] py-[4px]"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handlePreview}
        className="mt-auto flex h-[44px] items-center justify-center gap-[8px] rounded-[10px] bg-button text-[14px] font-semibold text-[#F8F8F8] transition-colors hover:bg-[#176300] shadow-sm"
      >
        <CiMail className="text-[18px]" />
        Preview
      </button>
    </article>
  );
};

export default CandidateCard;
