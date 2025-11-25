import { HiOutlineDocument, HiOutlinePencil, HiOutlineCheckCircle } from 'react-icons/hi2';

interface ConfirmationStepProps {
  companyName: string;
  jobRole: string;
  companyImage: string;
  location: string;
  contract: string;
  wage: string;
  cvFileName: string;
  coverLetter: string;
  isAIGenerated: boolean;
  isSubmitting?: boolean;
  submitError?: string | null;
  onBack: () => void;
  onEditCV: () => void;
  onEditCoverLetter: () => void;
  onSubmit: () => void;
}

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  companyName,
  jobRole,
  companyImage,
  location,
  contract,
  wage,
  cvFileName,
  coverLetter,
  isAIGenerated,
  isSubmitting = false,
  submitError = null,
  onBack,
  onEditCV,
  onEditCoverLetter,
  onSubmit,
}) => {
  const truncateCoverLetter = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <HiOutlineCheckCircle className="text-[28px] text-green-500" />
          <h2 className="font-semibold text-[24px] text-[#1C1C1C]">
            Review Your Application
          </h2>
        </div>
        <p className="text-[14px] text-[#1C1C1CBF]">
          Please review your application details before submitting
        </p>
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="p-4 rounded-[12px] bg-red-50 border border-red-200">
          <p className="text-[14px] text-red-600 font-medium">❌ {submitError}</p>
        </div>
      )}

      {/* Company Summary Card */}
      <div className="p-4 rounded-[12px] bg-gradient-to-br from-button/5 to-button/10 border border-button/20">
        <div className="flex items-start gap-4">
          <img
            src={companyImage}
            alt={companyName}
            className="w-[60px] h-[60px] rounded-[8px] object-cover border border-white/50"
          />
          <div className="flex-1">
            <p className="font-semibold text-[18px] text-[#1C1C1C] mb-1">
              {jobRole}
            </p>
            <p className="font-medium text-[14px] text-[#1C1C1C]/70 mb-2">
              {companyName}
            </p>
            <div className="flex flex-wrap gap-2 text-[12px] text-[#1C1C1C]/60">
              <span>📍 {location}</span>
              <span>•</span>
              <span>⏱️ {contract}</span>
              <span>•</span>
              <span>💰 {wage}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CV Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-[18px] text-[#1C1C1C]">
            Your CV
          </p>
          <button
            type="button"
            onClick={onEditCV}
            disabled={isSubmitting}
            className={`flex items-center gap-2 text-[14px] transition-colors ${
              isSubmitting
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-button hover:text-button/80'
            }`}
          >
            <HiOutlinePencil className="text-[16px]" />
            Edit
          </button>
        </div>
        
        <div className="flex items-center gap-3 p-4 rounded-[12px] bg-[#F8F8F8] border border-fade">
          <div className="flex items-center justify-center w-[40px] h-[40px] rounded-[8px] bg-white">
            <HiOutlineDocument className="text-[20px] text-button" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-[14px] text-[#1C1C1C]">
              {cvFileName}
            </p>
            <p className="text-[12px] text-[#1C1C1CBF]">
              CV Document
            </p>
          </div>
        </div>
      </div>

      {/* Cover Letter Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[18px] text-[#1C1C1C]">
              Cover Letter
            </p>
            {isAIGenerated && (
              <span className="text-[10px] font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                AI Generated
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onEditCoverLetter}
            disabled={isSubmitting}
            className={`flex items-center gap-2 text-[14px] transition-colors ${
              isSubmitting
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-button hover:text-button/80'
            }`}
          >
            <HiOutlinePencil className="text-[16px]" />
            Edit
          </button>
        </div>
        
        <div className="p-4 rounded-[12px] bg-[#F8F8F8] border border-fade">
          <p className="text-[14px] text-[#1C1C1C] leading-relaxed whitespace-pre-line">
            {truncateCoverLetter(coverLetter)}
          </p>
          {coverLetter.length > 200 && (
            <button
              type="button"
              onClick={onEditCoverLetter}
              disabled={isSubmitting}
              className={`text-[12px] mt-2 transition-colors ${
                isSubmitting
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-button hover:text-button/80'
              }`}
            >
              Read full letter →
            </button>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-[12px] bg-blue-50 border border-blue-200">
        <p className="text-[12px] text-blue-900">
          💡 <span className="font-medium">Before you submit:</span> Make sure all information is accurate. 
          Once submitted, you won't be able to edit your application. The hiring team will be notified immediately.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className={`flex-1 py-3 px-6 rounded-[10px] border-2 font-semibold text-[16px] transition-all ${
            isSubmitting
              ? 'border-gray-300 text-gray-400 cursor-not-allowed'
              : 'border-button text-button hover:bg-button/5'
          }`}
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className={`flex-1 py-3 px-6 rounded-[10px] font-semibold text-[16px] transition-all ${
            isSubmitting
              ? 'bg-button/50 text-white cursor-not-allowed'
              : 'bg-button text-white hover:bg-button/90 hover:scale-105'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Submitting...
            </span>
          ) : (
            'Submit Application'
          )}
        </button>
      </div>
    </div>
  );
};

export default ConfirmationStep;