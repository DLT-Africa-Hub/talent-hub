import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { HiOutlineBriefcase } from 'react-icons/hi';
import { IoMdClose } from 'react-icons/io';
import { BsSend } from 'react-icons/bs';
import { CandidateProfile } from '../../data/candidates';

interface CandidatePreviewModalProps {
  candidate: CandidateProfile | null;
  onClose: () => void;
  onChat?: (candidate: CandidateProfile) => void;
  onViewCV?: (candidate: CandidateProfile) => void;
}

const CandidatePreviewModal: React.FC<CandidatePreviewModalProps> = ({
  candidate,
  onClose,
  onChat,
  onViewCV,
}) => {
  if (!candidate) return null;

  const matchPercentage = 92; // This could come from candidate data
  const summary =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

  const handleChat = () => {
    onChat?.(candidate);
    onClose();
  };

  const handleViewCV = () => {
    onViewCV?.(candidate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-[20px] font-inter">
      <div className="relative flex w-full max-w-[600px] flex-col gap-[20px] rounded-[20px] border border-fade bg-white p-[28px] shadow-[0_18px_40px_-24px_rgba(47,81,43,0.12)]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-[20px] top-[20px] flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#F0F0F0] text-[#1C1C1C] transition hover:bg-[#E0E0E0]"
        >
          <IoMdClose className="text-[20px]" />
        </button>

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
              <span className="text-[16px] font-semibold text-[#1B7700]">
                {matchPercentage}% match
              </span>
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
                3 months
              </span>
              <span className="text-[14px] text-[#1C1C1CBF]">Contract</span>
            </div>
            <div className="h-[40px] w-px bg-[#E0E0E0]" />
            <div className="flex flex-col">
              <span className="text-[18px] font-semibold text-[#1C1C1C]">
                San
              </span>
              <span className="text-[14px] text-[#1C1C1CBF]">Francisco</span>
            </div>
            <div className="h-[40px] w-px bg-[#E0E0E0]" />
            <div className="flex flex-col">
              <span className="text-[18px] font-semibold text-[#1C1C1C]">
                $80k-100k
              </span>
              <span className="text-[14px] text-[#1C1C1CBF]">Annual</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-[15px] pt-[8px]">
            <button
              type="button"
              onClick={handleChat}
              className="flex flex-1 items-center justify-center gap-[12px] rounded-[10px] border border-button bg-white py-[15px] text-[16px] font-medium text-button transition hover:bg-[#F8F8F8]"
            >
              <HiOutlineChatBubbleLeftRight className="text-[24px]" />
              Chat
            </button>
            <button
              type="button"
              onClick={handleViewCV}
              className="flex flex-1 items-center justify-center gap-[12px] rounded-[10px] bg-button py-[15px] text-[16px] font-medium text-[#F8F8F8] transition hover:bg-[#176300]"
            >
              <BsSend className="text-[24px]" />
              View CV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidatePreviewModal;

