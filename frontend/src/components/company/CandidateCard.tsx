import { CiMail } from 'react-icons/ci';
import { HiOutlineBriefcase } from 'react-icons/hi';
import { CandidateProfile } from '../../data/candidates';

interface CandidateCardProps {
  candidate: CandidateProfile;
  onPreview?: (candidate: CandidateProfile) => void;
}

const statusStyles: Record<CandidateProfile['status'], string> = {
  applied: 'bg-[#E2F4DA] text-[#1B7700]',
  matched: 'bg-[#E9F1FF] text-[#1B5F77]',
  hired: 'bg-[#F9F3D6] text-[#8A6A05]',
  pending: 'bg-[#F5E6FF] text-[#5D1B77]',
};

const rankBadgeStyles: Record<CandidateProfile['status'], string> = {
  applied: 'bg-[#1B7700]',
  matched: 'bg-[#1B5F77]',
  hired: 'bg-[#8A6A05]',
  pending: 'bg-[#5D1B77]',
};

const CandidateCard: React.FC<CandidateCardProps> = ({ candidate, onPreview }) => {
  const handlePreview = () => {
    onPreview?.(candidate);
  };

  return (
    <article className="flex flex-col gap-[16px] rounded-[20px] border border-[#1B77001A] bg-[#FFFFFF] p-[18px] shadow-[0_18px_40px_-24px_rgba(47,81,43,0.12)] max-w-[320px] w-full">
      <div className="relative h-[208px] w-full overflow-hidden rounded-[16px]">
        <img
          src={candidate.image}
          alt={candidate.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute left-[14px] top-[14px] flex h-[44px] w-[44px] items-center justify-center rounded-full border border-white/40 bg-white/30 backdrop-blur-sm text-white text-[22px]">
          <HiOutlineBriefcase />
        </div>
      </div>

      <div className="flex items-start justify-between gap-[10px]">
        <div className="flex flex-col gap-[4px]">
          <p className="font-semibold text-[20px] text-[#1C1C1C]">{candidate.name}</p>
          <p className="font-sf text-[14px] text-[#1C1C1CBF]">{candidate.role}</p>
        </div>
        <div
          className={`flex items-center gap-[8px] rounded-full px-[14px] py-[6px] text-[12px] font-medium ${statusStyles[candidate.status]}`}
        >
          <span
            className={`flex h-[26px] w-[26px] items-center justify-center rounded-full text-[12px] text-white ${rankBadgeStyles[candidate.status]}`}
          >
            {candidate.rank}
          </span>
          {candidate.statusLabel}
        </div>
      </div>

      <div className="flex flex-col gap-[12px] text-[13px] text-[#1C1C1CBF]">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[#1C1C1CE5]">{candidate.experience}</span>
          <span className="h-[18px] w-px bg-[#1C1C1C1A]" />
          <span className="text-right">{candidate.location}</span>
        </div>
        <div className="flex flex-wrap items-center gap-[12px] text-[12px] font-medium text-[#1C1C1CE5]">
          {candidate.skills.map((skill) => (
            <span key={skill} className="flex items-center justify-center rounded-full border border-fade bg-[#F8F8F8] px-[14px] py-[6px]">
              {skill}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handlePreview}
        className="mt-auto flex h-[52px] items-center justify-center gap-[10px] rounded-[12px] bg-button text-[16px] font-medium text-[#F8F8F8] transition hover:bg-[#176300]"
      >
        <CiMail className="text-[22px]" />
        Preview
      </button>
    </article>
  );
};

export default CandidateCard;

