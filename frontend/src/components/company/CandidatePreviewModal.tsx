import { useEffect, useState } from 'react';
import { HiOutlineBriefcase, HiVideoCamera } from 'react-icons/hi';
import { CandidateProfile } from '../../data/candidates';
import BaseModal from '../ui/BaseModal';
import { Input, Button } from '../ui';
import { formatJobType, formatSalaryRange, getSalaryType } from '../../utils/job.utils';

interface CandidatePreviewModalProps {
  isOpen: boolean;
  candidate: CandidateProfile | null;
  onClose: () => void;
  onChat?: (candidate: CandidateProfile) => void;
  onViewCV?: (candidate: CandidateProfile) => void;
  onAccept?: (candidate: CandidateProfile) => void;
  onReject?: (candidate: CandidateProfile) => void;
  onScheduleInterview?: (
    candidate: CandidateProfile,
    scheduledAt: string
  ) => Promise<void> | void;
}


const CandidatePreviewModal: React.FC<CandidatePreviewModalProps> = ({
  isOpen,
  candidate,
  onClose,
  onChat,
  onViewCV,
  onAccept,
  onReject,
  onScheduleInterview,
}) => {
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowScheduleForm(false);
      setScheduledAt('');
      setScheduleError('');
      setScheduleSuccess('');
    }
  }, [isOpen]);

  if (!candidate) return null;

  const matchPercentage = candidate.matchPercentage ?? undefined;
  const summary = candidate.summary || 'No summary available.';
  const existingInterviewDate = candidate.interviewScheduledAt
    ? new Date(candidate.interviewScheduledAt)
    : null;
  const formattedInterviewDate = existingInterviewDate
    ? existingInterviewDate.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  const canScheduleInterview =
    candidate.directContact !== false &&
    !!candidate.applicationId &&
    typeof onScheduleInterview === 'function';
  
  // Format job details
  const jobType = candidate.jobType ? formatJobType(candidate.jobType) : 'Not specified';
  const salaryRange = formatSalaryRange(candidate.salary);
  const salaryType = candidate.jobType ? getSalaryType(candidate.jobType) : 'Annual';
  const locationParts = candidate.location ? candidate.location.split(' • ') : [];
  const locationCity = locationParts.length > 1 ? locationParts[1] : candidate.location;
  const locationType = locationParts.length > 0 ? locationParts[0] : '';


  const handleChat = () => {
    onChat?.(candidate);
    onClose();
  };

  const handleViewCV = () => {
    onViewCV?.(candidate);
  };
  

  const handleAccept = () => {
    onAccept?.(candidate);
  };

  const handleReject = () => {
    onReject?.(candidate);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError('');
    setScheduleSuccess('');

    if (!scheduledAt) {
      setScheduleError('Please select an interview date and time.');
      return;
    }

    if (!canScheduleInterview || !onScheduleInterview) {
      setScheduleError(
        'Scheduling is unavailable for this candidate. Please review the application first.'
      );
      return;
    }

    try {
      setIsScheduling(true);
      await onScheduleInterview(candidate, scheduledAt);
      setScheduleSuccess(
        'Interview scheduled successfully. The candidate has been notified.'
      );
      setShowScheduleForm(false);
      setScheduledAt('');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to schedule interview. Please try again.';
      setScheduleError(message);
    } finally {
      setIsScheduling(false);
    }
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

        {formattedInterviewDate && (
          <div className="p-3 rounded-xl border border-[#1B77001A] bg-[#EFFFE2] text-sm text-[#1C1C1C]">
            Next interview scheduled for <strong>{formattedInterviewDate}</strong>. You can join from the Interviews tab when it's time.
          </div>
        )}

        {scheduleError && (
          <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
            {scheduleError}
          </div>
        )}

        {scheduleSuccess && (
          <div className="p-3 rounded-xl border border-green-200 bg-green-50 text-sm text-green-700">
            {scheduleSuccess}
          </div>
        )}

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
        <div className="pt-[8px] flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleViewCV}
              className="flex-1"
            >
              View CV
            </Button>
            {/* Only show Chat if direct contact is enabled */}
            {candidate.directContact !== false && (
              <Button
                variant="secondary"
                onClick={handleChat}
                className="flex-1"
              >
                Chat
              </Button>
            )}
          </div>

          {!showScheduleForm ? (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleAccept}
                  className="flex-1 bg-button text-white hover:bg-[#176300] font-semibold py-3"
                >
                  Accept
                </Button>
                <Button
                  onClick={handleReject}
                  className="flex-1 bg-red-600 text-white hover:bg-red-700 font-semibold py-3 border-0"
                >
                  Reject
                </Button>
              </div>
              {/* Only show Schedule Interview if direct contact is enabled */}
              {candidate.directContact !== false && (
                <Button
                  onClick={() => {
                    setScheduleError('');
                    setScheduleSuccess('');
                    setShowScheduleForm(true);
                  }}
                  variant="secondary"
                  className="w-full border-2 border-button text-button hover:bg-button/5 font-medium py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={!canScheduleInterview}
                >
                  <HiVideoCamera className="text-[18px] mr-2" />
                  {canScheduleInterview ? 'Schedule Interview' : 'Interview scheduling unavailable'}
                </Button>
              )}
              {candidate.directContact === false && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-[14px] text-blue-800">
                    This application is being handled by DLT Africa admin team. They will review and manage this candidate on your behalf.
                  </p>
                </div>
              )}
              {candidate.directContact !== false && !candidate.applicationId && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-[14px] text-yellow-800">
                  Invite the candidate to apply or review their application before scheduling an interview.
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleScheduleSubmit} className="flex flex-col gap-3 p-4 border border-fade rounded-lg bg-[#F8F8F8]">
              <Input
                type="datetime-local"
                label="Interview Date & Time"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
              <p className="text-[13px] text-[#1C1C1C80]">
                A secure Talent Hub interview room will be generated automatically. Both you and the candidate will receive the link and notifications.
              </p>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={isScheduling}
                >
                  {isScheduling ? 'Scheduling...' : 'Schedule Interview'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowScheduleForm(false);
                    setScheduledAt('');
                    setScheduleError('');
                  }}
                  className="flex-1"
                  variant="secondary"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

export default CandidatePreviewModal;
