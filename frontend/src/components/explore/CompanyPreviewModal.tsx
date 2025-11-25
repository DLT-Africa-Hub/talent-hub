import { PiBuildingApartmentLight } from 'react-icons/pi';
import { BsBookmark, BsBookmarkFill } from 'react-icons/bs';
import {
  HiOutlineMapPin,
  HiOutlineCurrencyDollar,
  HiOutlineClock,
} from 'react-icons/hi2';
import { useState } from 'react';
import { Company } from './CompanyCard';
import BaseModal from '../ui/BaseModal';
import { ActionButtonGroup } from '../ui';
import CVSelectionStep from './CVSelectionStep';
import CoverLetterStep from './CoverLetterStep';
import ConfirmationStep from './ConfirmationStep';
import graduateApi from '../../api/graduate';

interface CompanyPreviewModalProps {
  isOpen: boolean;
  company: Company | null;
  onClose: () => void;
  onChat?: () => void;
  onApply?: () => void;
}

type ApplicationStep = 'preview' | 'cv-selection' | 'cover-letter' | 'confirmation';

interface ApplicationData {
  cv?: any;
  cvId?: string;
  cvFileName?: string;
  coverLetter?: string;
  isAIGenerated?: boolean;
}

const CompanyPreviewModal: React.FC<CompanyPreviewModalProps> = ({
  isOpen,
  company,
  onClose,
  onChat,
  onApply,
}) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentStep, setCurrentStep] = useState<ApplicationStep>('preview');
  const [applicationData, setApplicationData] = useState<ApplicationData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!company) return null;

  const jobDesc =
    'We are seeking a talented Frontend Developer to join our dynamic team. You will be responsible for building and maintaining user-facing features using React and modern JavaScript. You will work closely with our design team to implement responsive, accessible, and performant web applications. The ideal candidate has experience with React, JavaScript, CSS, and HTML, and is passionate about creating exceptional user experiences. You will collaborate with backend developers to integrate APIs and ensure seamless data flow.';

  const skills = ['React', 'TypeScript', 'JavaScript'];

  const handleChat = () => {
    onChat?.();
  };

  const handleApplyClick = () => {
    setCurrentStep('cv-selection');
  };

  const handleBackToPreview = () => {
    setCurrentStep('preview');
  };

  const handleCVSelection = (selectedCV?: any, newFile?: File) => {
    setApplicationData(prev => ({
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

  const handleCoverLetterSubmit = (coverLetter: string, isAIGenerated: boolean) => {
    setApplicationData(prev => ({
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
    if (!company.id) {
      setSubmitError('Job ID is missing');
      return;
    }
  
    if (!applicationData.cv) {
      setSubmitError('Please select a CV');
      return;
    }
  
    setIsSubmitting(true);
    setSubmitError(null);
  
    try {
      await graduateApi.applyToJob(company.jobId, {
        resume: applicationData.cv, 
        coverLetter: applicationData.coverLetter || "",
      });
  
      onApply?.();
      handleClose();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      setSubmitError(
        error.response?.data?.message || 
        'Failed to submit application. Please try again.'
      );
      setIsSubmitting(false);
    }
  };
  
  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
    // TODO: Implement bookmark functionality
  };

  const handleClose = () => {
    setCurrentStep('preview');
    setApplicationData({});
    setIsSubmitting(false);
    setSubmitError(null);
    onClose();
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
            submitError={submitError}
            onBack={handleBackToCoverLetter}
            onEditCV={handleEditCV}
            onEditCoverLetter={handleEditCoverLetter}
            onSubmit={handleFinalSubmit}
          />
        );
      
      case 'preview':
      default:
        return (
          <>
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
                <span className="font-semibold text-[16px]">{company.contract}</span>
              </div>
              <div className="hidden sm:block h-[24px] bg-fade w-0.5" />
              <div className="flex items-center gap-2 text-[#1C1C1C]">
                <HiOutlineMapPin className="text-[20px] text-button" />
                <span className="font-semibold text-[16px]">{company.location}</span>
              </div>
              <div className="hidden sm:block h-[24px] bg-fade w-0.5" />
              <div className="flex items-center gap-2 text-[#1C1C1C]">
                <HiOutlineCurrencyDollar className="text-[20px] text-button" />
                <span className="font-semibold text-[16px]">{company.wage}</span>
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
            <div className="pt-2">
              <ActionButtonGroup
                secondary={{
                  label: 'Chat',
                  onClick: handleChat,
                }}
                primary={{
                  label: 'Apply Now',
                  onClick: handleApplyClick,
                }}
              />
            </div>
          </>
        );
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      showCloseButton={false}
      className="border flex flex-col gap-[20px] border-fade py-[45px] max-h-[90vh] lg:h-auto px-[15px] lg:px-[150px] relative overflow-y-auto"
    >
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
          onClick={handleClose}
          className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#F0F0F0] text-[#1C1C1C] transition hover:bg-[#E0E0E0] hover:scale-110"
          aria-label="Close preview"
        >
          <span className="text-[20px] font-bold">×</span>
        </button>
      </div>

      {/* Step Content */}
      {renderStepContent()}
    </BaseModal>
  );
};

export default CompanyPreviewModal;