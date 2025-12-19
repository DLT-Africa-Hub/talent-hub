import { PiBuildingApartmentLight } from 'react-icons/pi';
import { BsBookmark, BsBookmarkFill } from 'react-icons/bs';
import {
  HiOutlineMapPin,
  HiOutlineCurrencyDollar,
  HiOutlineClock,
  HiOutlineCalendar,
} from 'react-icons/hi2';
import { useState, useMemo, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { Company } from './CompanyCard';
import { ActionButtonGroup } from '../ui';
import CVSelectionStep from './CVSelectionStep';
import CoverLetterStep from './CoverLetterStep';
import ConfirmationStep from './ConfirmationStep';
import { useApplicationSubmission } from '../../hooks/useApplicationSubmission';
import { useApplyToJob } from '../../hooks/useApplyToJob';
import { ApiResume } from '../../types/api';

interface CompanyPreviewModalProps {
  isOpen: boolean;
  company: Company | null;
  onClose: () => void;
  onApply?: () => void;
}

type ApplicationStep =
  | 'preview'
  | 'cv-selection'
  | 'cover-letter'
  | 'confirmation';

interface ApplicationData {
  cv?: ApiResume | File;
  cvId?: string;
  cvFileName?: string;
  coverLetter?: string;
  isAIGenerated?: boolean;
}

const CompanyPreviewModal: React.FC<CompanyPreviewModalProps> = ({
  isOpen,
  company,
  onClose,
  onApply,
}) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentStep, setCurrentStep] = useState<ApplicationStep>('preview');
  const [applicationData, setApplicationData] = useState<ApplicationData>({});

  const { hasApplied, checkingApplied, resetAppliedStatus } = useApplyToJob({
    jobId: company?.jobId,
    isOpen,
  });

  const { submitApplication, isSubmitting, submitError, resetError } =
    useApplicationSubmission({
      jobId: company?.jobId || '',
      onSuccess: () => {
        onApply?.();
        handleClose();
      },
    });

  // Define handleClose after all hooks that provide its dependencies
  const handleClose = useCallback(() => {
    setCurrentStep('preview');
    setApplicationData({});
    resetError?.();
    resetAppliedStatus?.();
    onClose();
  }, [onClose, resetError, resetAppliedStatus]);

  // Process description to render HTML properly
  // Must be called before early return to follow React hooks rules
  const descriptionContent = useMemo(() => {
    if (!company?.description) {
      return { type: 'text' as const, content: 'No description available.' };
    }

    // Decode HTML entities
    const decodeHtmlEntities = (str: string): string => {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = str;
      return textarea.value;
    };

    const description = decodeHtmlEntities(company.description);

    // Check if description contains HTML tags
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(description);

    if (hasHtmlTags) {
      // Sanitize HTML before rendering
      const sanitizedDescription = DOMPurify.sanitize(description);
      return { type: 'html' as const, content: sanitizedDescription };
    } else {
      return { type: 'text' as const, content: description };
    }
  }, [company?.description]);

  // Close on Escape key - must be before early return
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // Prevent body scroll when modal is open - must be before early return
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

  if (!company) return null;

  const skills = ['React', 'TypeScript', 'JavaScript'];

  const handleApplyClick = () => {
    setCurrentStep('cv-selection');
  };

  const handleBackToPreview = () => {
    setCurrentStep('preview');
  };

  const handleCVSelection = (selectedCV?: ApiResume, newFile?: File) => {
    setApplicationData((prev) => ({
      ...prev,
      cv: selectedCV || newFile,
      cvId: selectedCV?._id,
      cvFileName: selectedCV?.fileName || newFile?.name || 'Unknown CV',
    }));

    setCurrentStep('cover-letter');
  };

  const handleBackToCVSelection = () => {
    setCurrentStep('cv-selection');
  };

  const handleCoverLetterSubmit = (
    coverLetter: string,
    isAIGenerated: boolean
  ) => {
    setApplicationData((prev) => ({
      ...prev,
      coverLetter,
      isAIGenerated,
    }));

    setCurrentStep('confirmation');
  };

  const handleBackToCoverLetter = () => {
    setCurrentStep('cover-letter');
  };

  const handleEditCV = () => {
    setCurrentStep('cv-selection');
  };

  const handleEditCoverLetter = () => {
    setCurrentStep('cover-letter');
  };

  const handleFinalSubmit = async () => {
    if (!company.jobId) {
      return;
    }

    if (!applicationData.cv) {
      return;
    }

    await submitApplication({
      resume: applicationData.cv,
      coverLetter: applicationData.coverLetter || '',
    });
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
    // TODO: Implement bookmark functionality
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'cv-selection':
        return (
          <CVSelectionStep
            onBack={handleBackToPreview}
            onNext={handleCVSelection}
            selectedCVId={applicationData.cvId}
          />
        );

      case 'cover-letter':
        return (
          <CoverLetterStep
            companyName={company.name}
            jobRole={company.role}
            onBack={handleBackToCVSelection}
            onNext={handleCoverLetterSubmit}
            initialCoverLetter={applicationData.coverLetter}
            initialIsAIGenerated={applicationData.isAIGenerated}
          />
        );

      case 'confirmation':
        return (
          <ConfirmationStep
            companyName={company.name}
            jobRole={company.role}
            companyImage={company.image}
            location={company.location}
            contract={company.contract}
            wage={company.wage}
            cvFileName={applicationData.cvFileName || 'Unknown CV'}
            coverLetter={applicationData.coverLetter || ''}
            isAIGenerated={applicationData.isAIGenerated || false}
            isSubmitting={isSubmitting}
            submitError={submitError || undefined}
            onBack={handleBackToCoverLetter}
            onEditCV={handleEditCV}
            onEditCoverLetter={handleEditCoverLetter}
            onSubmit={handleFinalSubmit}
          />
        );

      case 'preview':
      default:
        return (
          <div className="flex flex-col gap-[15px]">
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

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-4 w-full">
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
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 bg-button rounded-full" />
                <p className="font-semibold text-[20px] text-[#1C1C1C]">
                  Job Description
                </p>
              </div>
              <div className="overflow-x-auto">
                {descriptionContent.type === 'html' ? (
                  <div
                    className="text-[16px] font-normal text-[#1C1C1CBF] leading-relaxed prose max-w-none
                      prose-p:text-[#1C1C1CBF] prose-p:leading-relaxed prose-p:my-3
                      prose-strong:text-[#1C1C1C] prose-strong:font-semibold
                      prose-em:text-[#1C1C1CBF] prose-em:italic
                      prose-ul:text-[#1C1C1CBF] prose-ul:my-3 prose-ul:list-disc prose-ul:pl-6
                      prose-ol:text-[#1C1C1CBF] prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-6
                      prose-li:text-[#1C1C1CBF] prose-li:my-1
                      prose-a:text-blue-600 prose-a:underline
                      prose-headings:text-[#1C1C1C] prose-headings:font-semibold
                      prose-h1:text-2xl prose-h1:font-bold prose-h1:mt-6 prose-h1:mb-3 prose-h1:first:mt-0
                      prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-3 prose-h2:first:mt-0
                      prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-5 prose-h3:mb-2 prose-h3:first:mt-0
                      prose-h4:text-base prose-h4:font-semibold prose-h4:mt-4 prose-h4:mb-2 prose-h4:first:mt-0
                      break-words"
                    dangerouslySetInnerHTML={{
                      __html: descriptionContent.content,
                    }}
                  />
                ) : (
                  <p className="text-[16px] font-normal text-[#1C1C1CBF] leading-relaxed whitespace-pre-line break-words">
                    {descriptionContent.content}
                  </p>
                )}
              </div>
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

            {/* Calendly Link */}
            {company.calendly?.enabled && company.calendly?.publicLink && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#1C1C1C80]">
                  <HiOutlineCalendar className="text-[18px] text-button" />
                  <p className="text-sm font-medium">
                    Schedule an interview directly
                  </p>
                </div>
                <a
                  href={company.calendly.publicLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-[10px] text-blue-700 font-medium text-center hover:bg-blue-100 transition-colors"
                >
                  Book Interview via Calendly
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2">
              <ActionButtonGroup
                primary={{
                  label: hasApplied
                    ? 'Already Applied'
                    : checkingApplied
                      ? 'Checking...'
                      : 'Apply Now',
                  onClick: hasApplied ? () => {} : handleApplyClick,
                  disabled: hasApplied || checkingApplied,
                }}
              />
            </div>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto transition-opacity duration-200 font-inter"
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="relative flex w-full max-w-[1000px] flex-col rounded-[20px] border border-fade bg-white shadow-[0_18px_40px_-24px_rgba(47,81,43,0.12)] my-4 sm:my-0 max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close and Bookmark Buttons */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2 z-10">
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
            onClick={handleClose}
            className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#F0F0F0] text-[#1C1C1C] transition hover:bg-[#E0E0E0] hover:scale-110"
            aria-label="Close preview"
          >
            <span className="text-[20px] font-bold">×</span>
          </button>
        </div>

        {/* Step Content - Scrollable Container */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-[30px] sm:py-[45px] px-[15px] sm:px-[30px] lg:px-[60px] xl:px-[150px]">
          <div className="flex flex-col gap-[20px]">{renderStepContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default CompanyPreviewModal;
