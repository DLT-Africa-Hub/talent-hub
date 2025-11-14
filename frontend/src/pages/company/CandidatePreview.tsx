import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { HiOutlineBriefcase } from 'react-icons/hi';
import { HiArrowRight } from 'react-icons/hi';
import { companyCandidates, CandidateProfile } from '../../data/candidates';

const CandidatePreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const candidate = companyCandidates.find(
    (c) => c.id === Number(id)
  ) as CandidateProfile | undefined;

  if (!candidate) {
    return (
      <div className="flex items-center justify-center h-screen w-full font-inter">
        <div className="text-center">
          <p className="text-[24px] font-semibold text-[#1C1C1C]">
            Candidate not found
          </p>
          <p className="text-[16px] text-[#1C1C1CBF] mt-2">
            The candidate you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  const matchPercentage = 92;
  const summary =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.';

  const handleBack = () => {
    navigate('/candidates');
  };

  const handleChat = () => {
    // TODO: Navigate to chat
  };

  const handleAccept = () => {
    // TODO: Handle accept candidate
  };

  return (
    <div className="flex items-center justify-center h-full lg:h-screen w-full font-inter px-[20px] py-[24px]">
      <div className="border flex flex-col gap-[24px] border-fade py-[45px] w-full h-full max-w-[1058px] lg:h-auto px-[15px] lg:px-[150px] rounded-[20px] bg-white">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleBack}
          className="self-end flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#F0F0F0] text-[#1C1C1C] transition hover:bg-[#E0E0E0]"
        >
          <span className="text-[20px] font-bold">×</span>
        </button>

        {/* Candidate Photo and Basic Info */}
        <div className="flex flex-col md:flex-row gap-[24px] items-start">
          <div className="relative h-[200px] w-[200px] shrink-0 overflow-hidden rounded-[16px]">
            <img
              src={candidate.image}
              alt={candidate.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute left-[14px] top-[14px] flex h-[44px] w-[44px] items-center justify-center rounded-full border border-white/40 bg-white/30 backdrop-blur-sm text-white">
              <HiOutlineBriefcase className="text-[22px]" />
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-[12px]">
            <div className="flex items-start justify-between gap-[16px]">
              <div className="flex flex-col gap-[4px]">
                <h1 className="text-[32px] font-semibold text-[#1C1C1C]">
                  {candidate.name}
                </h1>
                <p className="font-sf text-[18px] text-[#1C1C1CBF]">
                  {candidate.role}
                </p>
              </div>
              <div className="flex flex-col items-end gap-[8px]">
                <div className="flex items-center gap-[8px] rounded-full bg-button px-[14px] py-[8px]">
                  <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-white text-[14px] font-semibold text-button">
                    {candidate.rank}
                  </span>
                  <span className="text-[16px] font-semibold text-white">
                    {matchPercentage}% match
                  </span>
                </div>
                <p className="text-[14px] font-normal text-[#1C1C1CBF]">
                  {candidate.statusLabel}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="flex flex-col gap-[12px]">
          <h2 className="text-[20px] font-semibold text-[#1C1C1C]">Summary</h2>
          <p className="text-[16px] leading-relaxed text-[#1C1C1CBF]">
            {summary}
          </p>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-[12px]">
          {candidate.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-button bg-white px-[16px] py-[8px] text-[14px] font-medium text-button"
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
              San Francisco
            </span>
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
        <div className="flex flex-col md:flex-row w-full gap-[15px] items-center justify-center pt-[8px]">
          <button
            type="button"
            onClick={handleChat}
            className="w-full flex items-center justify-center gap-[12px] rounded-[10px] border border-button bg-white py-[15px] text-[16px] font-medium text-button transition hover:bg-[#F8F8F8]"
          >
            <HiOutlineChatBubbleLeftRight className="text-[24px]" />
            Chat
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="w-full flex items-center justify-center gap-[12px] rounded-[10px] bg-button py-[15px] text-[16px] font-medium text-[#F8F8F8] transition hover:bg-[#176300]"
          >
            Accept candidate
            <HiArrowRight className="text-[24px]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CandidatePreview;

