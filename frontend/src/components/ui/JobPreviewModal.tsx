import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { PiBuildingApartmentLight } from 'react-icons/pi';
import { BsSend } from 'react-icons/bs';
import LoadingSpinner from './LoadingSpinner';
import { DEFAULT_JOB_IMAGE, formatSalaryRange, formatJobType, getSalaryType } from '../../utils/job.utils';
import { stripHtml } from '../../utils/text.utils';
import { graduateApi } from '../../api/graduate';
import api from '../../api/client';

interface JobData {
  id: string;
  title: string;
  description?: string;
  companyName?: string;
  location?: string;
  jobType?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  requirements?: {
    skills?: string[];
  };
}

interface JobPreviewModalProps {
  isOpen: boolean;
  jobId: string | null;
  jobData?: JobData | null; // Pre-loaded job data (optional)
  matchScore?: number;
  hasApplied?: boolean;
  onClose: () => void;
  onChat?: () => void;
  onApply?: () => void;
}

const JobPreviewModal: React.FC<JobPreviewModalProps> = ({
  isOpen,
  jobId,
  jobData: preloadedJobData,
  matchScore,
  hasApplied: hasAppliedProp = false,
  onClose,
  onChat,
  onApply,
}) => {
  // State for real-time application status check
  const [hasApplied, setHasApplied] = useState(hasAppliedProp);

  // Fetch job details only if not provided
  const {
    data: fetchedJobData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['jobPreview', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      // Try to fetch from matches endpoint first (for graduates)
      try {
        const response = await api.get(`/graduates/matches`);
        const matches = response.data.matches || [];
        const match = matches.find((m: { job?: { id?: string } }) => m.job?.id === jobId);
        if (match?.job) {
          return match.job as JobData;
        }
      } catch (e) {
        // Fallback to direct job endpoint if available
        console.warn('Could not fetch from matches, trying direct endpoint');
      }
      // If no match found, try public endpoint (if available)
      // For now, return null - you may need to add a public job endpoint
      return null;
    },
    enabled: isOpen && !!jobId && !preloadedJobData,
  });

  // Check if graduate has already applied when modal opens
  useEffect(() => {
    if (!jobId || !isOpen) return;

    const jobIdStr = jobId; // Store in variable after null check
    if (!jobIdStr) return;

    const checkApplied = async () => {
      try {
        const res = await graduateApi.alreadyApplied(jobIdStr);
        setHasApplied(res.applied); // backend returns { applied: true/false }
      } catch (err) {
        console.error('Failed to check application status', err);
        // Fallback to prop value on error
        setHasApplied(hasAppliedProp);
      }
    };

    checkApplied();
  }, [jobId, isOpen, hasAppliedProp]);

  // Use preloaded data if available, otherwise use fetched data
  const job = preloadedJobData || fetchedJobData;

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

  if (!isOpen || !jobId) return null;

  const skills = job?.requirements?.skills || [];
  const salaryRange = formatSalaryRange(job?.salary);
  const salaryType = job?.jobType ? getSalaryType(job.jobType) : 'Annual';
  const formattedJobType = job?.jobType ? formatJobType(job.jobType) : 'Full-time';

  const handleChat = () => {
    onChat?.();
  };

  const handleApply = () => {
    if (hasApplied) return;
    onApply?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-preview-title"
    >
      <div className="border flex flex-col gap-[20px] border-fade py-[45px] w-full max-w-[1058px] max-h-[90vh] lg:h-auto px-[15px] lg:px-[150px] rounded-[20px] bg-white relative overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#F0F0F0] text-[#1C1C1C] transition hover:bg-[#E0E0E0] z-10"
          aria-label="Close preview"
        >
          <span className="text-[20px] font-bold">×</span>
        </button>

        {isLoading && (
          <div className="flex items-center justify-center py-[60px]">
            <LoadingSpinner message="Loading job details..." />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-[60px] gap-4">
            <p className="text-red-500 text-[18px] font-medium">
              Failed to load job details
            </p>
            <p className="text-[#1C1C1C80] text-[14px]">
              Please try again later
            </p>
          </div>
        )}

        {!isLoading && !error && job && (
          <>
            {/* Company Image */}
            <div className="w-full h-[232px] relative">
              <img
                src={DEFAULT_JOB_IMAGE}
                className="object-cover w-full h-full rounded-[10px]"
                alt={job.companyName || 'Company'}
              />
              <div className="absolute top-2 left-2 bg-white/20 backdrop-blur-xs text-[18px] border border-white/30 p-[12px] rounded-full shadow-lg">
                <PiBuildingApartmentLight className="text-[#F8F8F8]" />
              </div>
            </div>

            {/* Company and Job Details */}
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-[5px]">
                <p className="font-semibold text-[24px] text-[#1C1C1C]">
                  {job.companyName || 'Company'}
                </p>
                <p className="font-sf font-normal text-[16px] text-[#1C1C1CBF]">
                  {job.title || 'Position'}
                </p>
              </div>
              {typeof matchScore === 'number' && (
                <div className="flex items-center h-[49px] bg-fade text-[#1C1C1CBF] text-[16px] py-[15px] px-6 rounded-[70px]">
                  {Math.round(
                    matchScore > 1 ? Math.min(matchScore, 100) : matchScore * 100
                  )}
                  % match
                </div>
              )}
            </div>

            {/* Job Description */}
            <div className="flex flex-col gap-5">
              <p className="font-semibold text-[20px] text-[#1C1C1C]">
                Job Description
              </p>
              {hasApplied && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-[14px] text-green-800">
                  You have already applied for this job. Sit tight — we will notify you when the company responds.
                </div>
              )}
              <p className="text-[16px] font-normal text-[#1C1C1CBF] leading-relaxed whitespace-pre-line">
                {job.description ? stripHtml(job.description) : 'No description available.'}
              </p>
            </div>

            {/* Skills */}
            <div className="flex flex-col gap-[27px]">
              {skills.length > 0 && (
                <div className="flex items-center gap-[6px] flex-wrap">
                  {skills.map((skill) => (
                    <button
                      key={skill}
                      className="border border-button text-button rounded-[50px] py-[5px] px-2.5 text-[14px]"
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              )}

              {/* Employment Information */}
              <div className="flex w-full items-center justify-between">
                <p className="text-center w-full font-semibold text-[16px]">
                  {formattedJobType}
                </p>
                <div className="h-[20px] bg-black w-0.5" />
                <p className="text-center w-full font-semibold">
                  {job.location || 'Location not specified'}
                </p>
                <div className="h-[20px] bg-black w-0.5" />
                <p className="text-center w-full font-semibold">
                  {salaryRange === 'Not specified' ? '—' : salaryRange.replace(/[k$]/g, '')} {salaryType}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col md:flex-row w-full gap-[15px] items-center justify-center">
                <button
                  type="button"
                  onClick={handleChat}
                  className="w-full flex items-center justify-center gap-[12px] border border-button py-[15px] rounded-[10px] text-button cursor-pointer transition hover:bg-[#F8F8F8]"
                >
                  <HiOutlineChatBubbleLeftRight className="text-[24px]" />
                  <p className="text-[16px] font-medium">Chat</p>
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={hasApplied}
                  className={`w-full flex items-center justify-center gap-[12px] py-[15px] rounded-[10px] text-[16px] font-medium transition ${
                    hasApplied
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-button text-[#F8F8F8] cursor-pointer hover:bg-[#176300]'
                  }`}
                >
                  <BsSend className="text-[24px]" />
                  <p>{hasApplied ? 'Application Submitted' : 'Apply'}</p>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default JobPreviewModal;

