import { useEffect, useState } from 'react';
import { HiOutlineBriefcase, HiVideoCamera } from 'react-icons/hi';
import { CandidateProfile } from '../../types/candidates';
import BaseModal from '../ui/BaseModal';
import { Input, Button } from '../ui';
import { formatSalaryPerAnnum } from '../../utils/job.utils';

interface CandidatePreviewModalProps {
  isOpen: boolean;
  candidate: CandidateProfile | null;
  onClose: () => void;
  onViewCV?: (candidate: CandidateProfile) => void;
  onAccept?: (candidate: CandidateProfile) => void;
  onReject?: (candidate: CandidateProfile) => void;
  onScheduleInterview?: (
    candidate: CandidateProfile,
    scheduledAt: string,
    durationMinutes?: number
  ) => Promise<void> | void;
  onSuggestTimeSlots?: (candidate: CandidateProfile) => void;
  isAccepting?: boolean;
  isRejecting?: boolean;
  isSchedulingInterview?: boolean;
  isCalendlyConnected?: boolean;
}

const CandidatePreviewModal: React.FC<CandidatePreviewModalProps> = ({
  isOpen,
  candidate,
  onClose,
  onViewCV,
  onAccept,
  onReject,
  onScheduleInterview,
  onSuggestTimeSlots,
  isAccepting = false,
  isRejecting = false,
  isSchedulingInterview = false,
  isCalendlyConnected = false,
}) => {
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowScheduleForm(false);
      setScheduledAt('');
      setDurationMinutes(30);
      setScheduleError('');
      setScheduleSuccess('');
    }
  }, [isOpen]);

  if (!candidate) return null;

  const applicationStatus = candidate.statusLabel?.toLowerCase() || '';
  const isAccepted = applicationStatus === 'accepted';
  // Check if offer is sent (offer_sent or hired) or applicant is rejected
  const isOfferSent =
    applicationStatus === 'offer sent' ||
    applicationStatus === 'offer_sent' ||
    candidate.status === 'hired';
  const isRejected = applicationStatus === 'rejected';
  // Hide buttons if offer is sent or applicant is rejected
  const canAcceptOrReject =
    !isOfferSent && !isRejected && (onAccept || onReject);

  // Check if there's a completed interview (not missed or rescheduled)
  const hasCompletedInterview = candidate.interviewStatus === 'completed';
  // Button should show "Send Offer" when accepted, but be disabled until interview is completed
  const shouldShowSendOffer = isAccepted;

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

  // Check if there's an active interview (scheduled, pending selection, or in progress)
  // Check both interviewStatus and hasUpcomingInterview for comprehensive coverage
  const hasActiveInterview =
    candidate.hasUpcomingInterview ||
    (candidate.interviewStatus &&
      ['pending_selection', 'scheduled', 'in_progress'].includes(
        candidate.interviewStatus
      )) ||
    (candidate.interviewScheduledAt && !candidate.interviewStatus); // Fallback: if scheduledAt exists but no status, assume active
  const isSchedulingLoading = isSchedulingInterview || isScheduling;
  const canScheduleInterview =
    !hasActiveInterview &&
    candidate.directContact !== false &&
    !!candidate.applicationId &&
    typeof onScheduleInterview === 'function';
  const canShowScheduleControls =
    candidate.directContact !== false &&
    (onScheduleInterview || onSuggestTimeSlots);
  const canInteractWithScheduling =
    canScheduleInterview && !isSchedulingLoading && !hasActiveInterview;
  const showDirectContactDisabled = candidate.directContact === false;
  const showApplicationRequiredMessage =
    candidate.directContact !== false &&
    !candidate.applicationId &&
    onScheduleInterview;
  const locationParts = candidate.location
    ? candidate.location.split(' • ')
    : [];
  const locationCity =
    locationParts.length > 1 ? locationParts[1] : candidate.location;
  const locationType = locationParts.length > 0 ? locationParts[0] : '';

  const handleViewCV = () => {
    onViewCV?.(candidate);
  };

  const handleAccept = () => {
    if (isAccepting || isRejecting) return;
    onAccept?.(candidate);
  };

  const handleReject = () => {
    if (isAccepting || isRejecting) return;
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
      await onScheduleInterview(candidate, scheduledAt, durationMinutes);
      setScheduleSuccess(
        'Interview scheduled successfully. The candidate has been notified.'
      );
      setShowScheduleForm(false);
      setScheduledAt('');
      setDurationMinutes(30);
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const message =
        err?.response?.data?.message ||
        err?.message ||
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
            <p className="font-sf text-[18px] text-[#1C1C1CBF] capitalize">
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
            Next interview scheduled for{' '}
            <strong>{formattedInterviewDate}</strong>. You can join from the
            Interviews tab when it's time.
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
            <span className="text-[14px] text-[#1C1C1CBF]">
              Years of Experience
            </span>
          </div>
          <div className="h-[40px] w-px bg-[#E0E0E0]" />
          <div className="flex flex-col">
            <span className="text-[18px] font-semibold text-[#1C1C1C]">
              {locationType || locationCity.split(',')[0]}
            </span>
            <span className="text-[14px] text-[#1C1C1CBF]">
              Location (City)
            </span>
          </div>
          {candidate.salaryPerAnnum && (
            <>
              <div className="h-[40px] w-px bg-[#E0E0E0]" />
              <div className="flex flex-col">
                <span className="text-[18px] font-semibold text-[#1C1C1C]">
                  {formatSalaryPerAnnum(candidate.salaryPerAnnum).replace(
                    '/year',
                    ''
                  )}
                </span>
                <span className="text-[14px] text-[#1C1C1CBF]">
                  Expected Salary
                </span>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-[8px] flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleViewCV}
              className="flex-1"
              disabled={!candidate.cv}
            >
              {candidate.cv ? 'View CV' : 'No CV Available'}
            </Button>
          </div>

          {!showScheduleForm ? (
            (canAcceptOrReject ||
              onScheduleInterview ||
              isOfferSent ||
              isRejected) && (
              <div className="flex flex-col gap-3">
                {/* Show status if offer is sent or applicant is rejected */}
                {(isOfferSent || isRejected) && (
                  <div
                    className={`p-3 rounded-xl border font-medium text-center ${
                      isOfferSent
                        ? 'border-green-200 bg-green-50 text-green-800'
                        : 'border-red-200 bg-red-50 text-red-800'
                    }`}
                  >
                    Status: {candidate.statusLabel || 'N/A'}
                  </div>
                )}
                {/* Show accept/reject buttons only if not offer sent and not rejected */}
                {canAcceptOrReject && (
                  <div className="flex gap-2">
                    {onAccept && (
                      <Button
                        variant="primary"
                        onClick={handleAccept}
                        disabled={
                          isOfferSent ||
                          isAccepting ||
                          isRejecting ||
                          (isAccepted && !hasCompletedInterview)
                        }
                        className="flex-1 bg-button text-white hover:bg-[#176300] font-semibold py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isAccepting ? (
                          <>
                            <svg
                              className="animate-spin h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Processing...
                          </>
                        ) : shouldShowSendOffer ? (
                          'Send Offer'
                        ) : (
                          'Accept Application'
                        )}
                      </Button>
                    )}
                    {onReject && (
                      <Button
                        onClick={handleReject}
                        disabled={isOfferSent || isAccepting || isRejecting}
                        className="flex-1 bg-red-600 text-white hover:bg-red-700 font-semibold py-3 border-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isRejecting ? (
                          <>
                            <svg
                              className="animate-spin h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          'Reject'
                        )}
                      </Button>
                    )}
                  </div>
                )}
                {/* Schedule Interview Controls */}
                {isCalendlyConnected ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-[14px] text-blue-800 font-medium mb-2">
                      📅 Calendly Integration Active
                    </p>
                    <p className="text-[13px] text-blue-700">
                      Candidates can schedule interviews directly from your
                      Calendly availability. They'll see your available time
                      slots and can book interviews themselves.
                    </p>
                  </div>
                ) : (
                  canShowScheduleControls && (
                    <div className="flex flex-col gap-2">
                      {onScheduleInterview && (
                        <Button
                          onClick={() => {
                            setScheduleError('');
                            setScheduleSuccess('');
                            setShowScheduleForm(true);
                          }}
                          variant="secondary"
                          className="w-full border-2 border-button text-button hover:bg-button/5 font-medium py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={!canInteractWithScheduling}
                        >
                          <HiVideoCamera className="text-[18px] mr-2" />
                          {hasActiveInterview
                            ? 'Interview Already Scheduled'
                            : canScheduleInterview
                              ? 'Quick Schedule (Single Time)'
                              : 'Interview scheduling unavailable'}
                        </Button>
                      )}
                      {onSuggestTimeSlots && canInteractWithScheduling && (
                        <Button
                          onClick={() => onSuggestTimeSlots(candidate)}
                          variant="secondary"
                          className="w-full border-2 border-[#6B9B5A] text-[#6B9B5A] hover:bg-[#6B9B5A]/5 font-medium py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={!canInteractWithScheduling}
                        >
                          <HiVideoCamera className="text-[18px] mr-2" />
                          Suggest Multiple Time Slots
                        </Button>
                      )}
                    </div>
                  )
                )}
                {showDirectContactDisabled && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-[14px] text-blue-800">
                      This application is being handled by DLT Africa admin
                      team. They will review and manage this candidate on your
                      behalf.
                    </p>
                  </div>
                )}
                {showApplicationRequiredMessage && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-[14px] text-yellow-800">
                    Invite the candidate to apply or review their application
                    before scheduling an interview.
                  </div>
                )}
              </div>
            )
          ) : (
            <form
              onSubmit={handleScheduleSubmit}
              className="flex flex-col gap-3 p-4 border border-fade rounded-lg bg-[#F8F8F8]"
            >
              <Input
                type="datetime-local"
                label="Interview Date & Time"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-medium text-[#1C1C1C]">
                  Session Duration
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[15, 30, 45, 60].map((duration) => (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => setDurationMinutes(duration)}
                      className={`px-4 py-2 rounded-lg border text-[14px] font-medium transition ${
                        durationMinutes === duration
                          ? 'border-button bg-[#DBFFC0] text-[#1C1C1C]'
                          : 'border-[#E5E7EB] bg-white text-[#1C1C1C80] hover:border-[#C5D2BF]'
                      }`}
                    >
                      {duration === 60 ? '1 hour' : `${duration} min`}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[13px] text-[#1C1C1C80]">
                A secure Talent Hub interview room will be generated
                automatically. Both you and the candidate will receive the link
                and notifications.
              </p>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 flex items-center justify-center gap-2"
                  disabled={isSchedulingLoading}
                >
                  {isSchedulingLoading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Scheduling...
                    </>
                  ) : (
                    'Schedule Interview'
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowScheduleForm(false);
                    setScheduledAt('');
                    setDurationMinutes(30);
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
