import { useEffect } from 'react';
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { PiBuildingApartmentLight } from 'react-icons/pi';
import { BsSend, BsBookmark, BsBookmarkFill } from 'react-icons/bs';
import {
  HiOutlineMapPin,
  HiOutlineCurrencyDollar,
  HiOutlineClock,
} from 'react-icons/hi2';
import { useState } from 'react';
import { Company } from './CompanyCard';

interface CompanyPreviewModalProps {
  isOpen: boolean;
  company: Company | null;
  onClose: () => void;
  onChat?: () => void;
  onApply?: () => void;
}

const CompanyPreviewModal: React.FC<CompanyPreviewModalProps> = ({
  isOpen,
  company,
  onClose,
  onChat,
  onApply,
}) => {
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !company) return null;

  const jobDesc =
    'We are seeking a talented Frontend Developer to join our dynamic team. You will be responsible for building and maintaining user-facing features using React and modern JavaScript. You will work closely with our design team to implement responsive, accessible, and performant web applications. The ideal candidate has experience with React, JavaScript, CSS, and HTML, and is passionate about creating exceptional user experiences. You will collaborate with backend developers to integrate APIs and ensure seamless data flow.';

  const skills = ['React', 'TypeScript', 'JavaScript'];

  const handleChat = () => {
    onChat?.();
  };

  const handleApply = () => {
    onApply?.();
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
    // TODO: Implement bookmark functionality
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto transition-opacity duration-200"
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-preview-title"
    >
      <div className="border flex flex-col gap-[20px] border-fade py-[45px] w-full max-w-[1058px] max-h-[90vh] lg:h-auto px-[15px] lg:px-[150px] rounded-[20px] bg-white relative overflow-y-auto shadow-2xl transform transition-all duration-300 scale-100">
        {/* Close and Bookmark Buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <button
            type="button"
            onClick={handleBookmark}
            className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#F0F0F0] text-[#1C1C1C] transition hover:bg-[#E0E0E0] hover:scale-110"
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark job'}
          >
            {isBookmarked ? (
              <BsBookmarkFill className="text-[18px] text-button" />
            ) : (
              <BsBookmark className="text-[18px]" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#F0F0F0] text-[#1C1C1C] transition hover:bg-[#E0E0E0] hover:scale-110"
            aria-label="Close preview"
          >
            <span className="text-[20px] font-bold">×</span>
          </button>
        </div>

        {/* Company Image */}
        <div className="w-full h-[232px] relative overflow-hidden rounded-[10px] group">
          <img
            src={company.image}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            alt={company.name}
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[18px] border border-white/50 p-[12px] rounded-full shadow-lg">
            <PiBuildingApartmentLight className="text-button" />
          </div>
        </div>

        {/* Company and Job Details */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
          <div className="flex flex-col gap-[8px] flex-1">
            <p
              id="company-preview-title"
              className="font-semibold text-[24px] sm:text-[28px] text-[#1C1C1C] leading-tight"
            >
              {company.name}
            </p>
            <p className="font-sf font-medium text-[18px] text-[#1C1C1C]">
              {company.role}
            </p>
          </div>
          <div className="flex items-center h-[49px] bg-linear-to-r from-button/10 to-button/5 border border-button/20 text-[#1C1C1C] text-[16px] font-semibold py-[15px] px-6 rounded-[70px] whitespace-nowrap shadow-sm">
            <span className="text-button mr-1">●</span>
            {company.match}% match
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-[#F8F8F8] rounded-[12px] border border-fade">
          <div className="flex items-center gap-2 text-[#1C1C1C]">
            <HiOutlineClock className="text-[20px] text-button" />
            <span className="font-semibold text-[16px]">
              {company.contract}
            </span>
          </div>
          <div className="hidden sm:block h-[24px] bg-fade w-0.5" />
          <div className="flex items-center gap-2 text-[#1C1C1C]">
            <HiOutlineMapPin className="text-[20px] text-button" />
            <span className="font-semibold text-[16px]">
              {company.location}
            </span>
          </div>
          <div className="hidden sm:block h-[24px] bg-fade w-0.5" />
          <div className="flex items-center gap-2 text-[#1C1C1C]">
            <HiOutlineCurrencyDollar className="text-[20px] text-button" />
            <span className="font-semibold text-[16px]">
              {company.wage}
            </span>
          </div>
        </div>

        {/* Job Description */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 bg-button rounded-full" />
            <p className="font-semibold text-[20px] text-[#1C1C1C]">
              Job Description
            </p>
          </div>
          <p className="text-[16px] font-normal text-[#1C1C1CBF] leading-relaxed whitespace-pre-line">
            {jobDesc}
          </p>
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 bg-button rounded-full" />
              <p className="font-semibold text-[20px] text-[#1C1C1C]">
                Required Skills
              </p>
            </div>
            <div className="flex items-center gap-[8px] flex-wrap">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="border border-button/30 bg-button/5 text-button rounded-[50px] py-[8px] px-4 text-[14px] font-medium transition hover:bg-button/10 hover:border-button/50 hover:scale-105"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row w-full gap-[15px] items-center justify-center pt-2">
          <button
            type="button"
            onClick={handleChat}
            className="w-full flex items-center justify-center gap-[12px] border-2 border-button py-[15px] rounded-[10px] text-button cursor-pointer transition-all hover:bg-button/5 hover:border-button/80 hover:scale-[1.02] active:scale-[0.98] font-medium"
          >
            <HiOutlineChatBubbleLeftRight className="text-[24px]" />
            <p className="text-[16px] font-medium">Chat</p>
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="w-full flex items-center justify-center gap-[12px] bg-button py-[15px] rounded-[10px] text-[#F8F8F8] cursor-pointer transition-all hover:bg-[#176300] hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg font-medium"
          >
            <BsSend className="text-[24px]" />
            <p className="text-[16px] font-medium">Apply Now</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyPreviewModal;
