import { useState } from 'react';
import {
  HiVideoCamera,
  HiClock,
  HiCalendar,
  HiGlobeAlt,
  HiCheck,
  HiLocationMarker,
  HiBriefcase,
} from 'react-icons/hi';
import { Button } from '../ui';
import { COMMON_TIMEZONES } from '../../constants/timezones';
import {
  formatDateLong,
  getTimeUntilDeadline,
  formatDuration,
} from '../../utils/date.utils';

export interface TimeSlotOption {
  id: string;
  date: string;
  duration: number;
  timezone: string;
  companyTime?: string;
  graduateTime?: string;
  companyTimezoneAbbr?: string;
  graduateTimezoneAbbr?: string;
  durationLabel?: string;
}

export interface PendingInterview {
  id: string;
  status: string;
  job?: {
    id?: string;
    title?: string;
    location?: string;
    jobType?: string;
  };
  company?: {
    id?: string;
    name?: string;
  };
  suggestedTimeSlots: TimeSlotOption[];
  companyTimezone?: string;
  selectionDeadline?: string;
  createdAt?: string;
}

interface InterviewTimeSlotSelectorProps {
  interview: PendingInterview;
  onSelectSlot: (
    interviewId: string,
    slotId: string,
    graduateTimezone: string
  ) => Promise<void>;
  isSelecting?: boolean;
}

const InterviewTimeSlotSelector: React.FC<InterviewTimeSlotSelectorProps> = ({
  interview,
  onSelectSlot,
  isSelecting = false,
}) => {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [graduateTimezone, setGraduateTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatDate = (dateString: string, timezone: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        timeZone: timezone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const handleConfirm = async () => {
    if (!selectedSlotId) {
      setError('Please select a time slot');
      return;
    }

    setError('');
    setSuccess('');

    try {
      await onSelectSlot(interview.id, selectedSlotId, graduateTimezone);
      setSuccess(
        'Time slot confirmed! You will receive a confirmation notification.'
      );
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to confirm time slot. Please try again.'
      );
    }
  };

  const isDeadlinePassed = interview.selectionDeadline
    ? new Date(interview.selectionDeadline) < new Date()
    : false;

  const hasSelectedSlot = !!selectedSlotId;
  const canConfirm = hasSelectedSlot && !isSelecting && !isDeadlinePassed;
  const showConfirmButton = !success;

  const timeUntilDeadline = interview.selectionDeadline
    ? getTimeUntilDeadline(interview.selectionDeadline)
    : null;

  return (
    <div className="border border-[#E5E7EB] rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-6 bg-linear-to-br from-button/10 via-[#ADED9A]/15 to-button/5 border-b border-[#E5E7EB]">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-12 h-12 rounded-xl bg-button/20 flex items-center justify-center shadow-sm">
              <HiVideoCamera className="text-button text-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-[#1C1C1C] mb-1">
                {interview.company?.name || 'Company'}
              </h3>
              <div className="flex items-center gap-3 text-sm text-[#1C1C1C80]">
                <div className="flex items-center gap-1.5">
                  <HiBriefcase className="text-[#1C1C1C60]" />
                  <span>{interview.job?.title || 'Position'}</span>
                </div>
                {interview.job?.location && (
                  <>
                    <span className="text-[#1C1C1C40]">•</span>
                    <div className="flex items-center gap-1.5">
                      <HiLocationMarker className="text-[#1C1C1C60]" />
                      <span>{interview.job.location}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold whitespace-nowrap ml-3">
            Awaiting Selection
          </span>
        </div>

        {interview.selectionDeadline && (
          <div
            className={`mt-4 p-3 rounded-xl border ${
              isDeadlinePassed
                ? 'bg-red-50 border-red-200'
                : timeUntilDeadline
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <HiClock
                className={`text-base ${
                  isDeadlinePassed
                    ? 'text-red-600'
                    : timeUntilDeadline
                      ? 'text-amber-600'
                      : 'text-blue-600'
                }`}
              />
              <div className="flex-1">
                {isDeadlinePassed ? (
                  <span className="text-sm font-medium text-red-700">
                    Selection deadline has passed
                  </span>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-[#1C1C1C]">
                      {timeUntilDeadline
                        ? `Select within ${timeUntilDeadline}`
                        : 'Deadline approaching'}
                    </span>
                    <span className="text-xs text-[#1C1C1C80]">
                      Deadline:{' '}
                      {formatDateLong(
                        interview.selectionDeadline,
                        graduateTimezone
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col gap-5">
        {/* Error/Success messages */}
        {error && (
          <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50 text-sm text-red-700 flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-red-700 text-xs font-bold">!</span>
            </div>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl border-2 border-green-200 bg-green-50 text-sm text-green-700 flex items-start gap-2">
            <HiCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Timezone selector */}
        <div className="flex flex-col gap-2.5">
          <label className="flex items-center gap-2 text-sm font-semibold text-[#1C1C1C]">
            <HiGlobeAlt className="text-button text-base" />
            Your Timezone
          </label>
          <p className="text-xs text-[#1C1C1C80] -mt-1">
            Times will be displayed in your selected timezone
          </p>
          <select
            value={graduateTimezone}
            onChange={(e) => setGraduateTimezone(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-[#E5E7EB] bg-white text-sm font-medium text-[#1C1C1C] focus:border-button focus:ring-2 focus:ring-button/20 outline-none transition-all hover:border-[#D1D5DB]"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Time slots */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#1C1C1C] mb-1">
              <HiCalendar className="text-button text-base" />
              Available Time Slots
            </label>
            <p className="text-xs text-[#1C1C1C80]">
              Select your preferred interview time. Click on a time slot to
              select it.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {interview.suggestedTimeSlots.map((slot) => {
              const isSelected = selectedSlotId === slot.id;
              const isPast = new Date(slot.date) < new Date();
              const slotDate = new Date(slot.date);
              const isToday =
                slotDate.toDateString() === new Date().toDateString();
              const isTomorrow =
                slotDate.toDateString() ===
                new Date(Date.now() + 86400000).toDateString();

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => !isPast && setSelectedSlotId(slot.id)}
                  disabled={isPast || isSelecting || !!success}
                  className={`w-full p-5 rounded-xl border-2 text-left transition-all relative overflow-hidden ${
                    isPast
                      ? 'border-[#E5E7EB] bg-gray-50 opacity-50 cursor-not-allowed'
                      : isSelected
                        ? 'border-button bg-linear-to-br from-[#DBFFC0] to-[#C8F5A8] shadow-md shadow-button/20 scale-[1.02]'
                        : 'border-[#E5E7EB] bg-white hover:border-button/60 hover:shadow-md hover:bg-button/5 active:scale-[0.99]'
                  }`}
                >
                  {/* Selection indicator bar */}
                  {isSelected && !isPast && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-button" />
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Time indicator */}
                      <div
                        className={`shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center ${
                          isSelected && !isPast
                            ? 'bg-button text-white'
                            : isPast
                              ? 'bg-gray-200 text-gray-500'
                              : 'bg-button/10 text-button'
                        }`}
                      >
                        <span className="text-xs font-bold leading-tight">
                          {
                            slotDate
                              .toLocaleString('en-US', {
                                timeZone: graduateTimezone,
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })
                              .split(' ')[0]
                          }
                        </span>
                        <span className="text-[10px] opacity-80">
                          {
                            slotDate
                              .toLocaleString('en-US', {
                                timeZone: graduateTimezone,
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })
                              .split(' ')[1]
                          }
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-semibold ${
                              isSelected && !isPast
                                ? 'text-[#1C1C1C] text-base'
                                : 'text-[#1C1C1C]'
                            }`}
                          >
                            {formatDate(slot.date, graduateTimezone)}
                          </span>
                          {isToday && !isPast && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                              Today
                            </span>
                          )}
                          {isTomorrow && !isPast && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                              Tomorrow
                            </span>
                          )}
                          {isPast && (
                            <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs font-medium">
                              Passed
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#1C1C1C80]">
                          <span className="font-medium">
                            {formatDuration(slot.duration)}
                          </span>
                          <span className="text-[#1C1C1C60]">•</span>
                          <span>{slot.timezone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Selection indicator */}
                    {isSelected && !isPast && (
                      <div className="shrink-0 w-8 h-8 rounded-full bg-button flex items-center justify-center shadow-lg shadow-button/30">
                        <HiCheck className="text-white text-lg font-bold" />
                      </div>
                    )}
                    {!isSelected && !isPast && (
                      <div className="shrink-0 w-8 h-8 rounded-full border-2 border-[#E5E7EB] flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full border-2 border-[#D1D5DB]" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirm button */}
        {showConfirmButton && (
          <div className="pt-2">
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={`w-full py-3.5 text-base font-semibold shadow-lg transition-all ${
                canConfirm
                  ? 'hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                  : ''
              }`}
              variant="primary"
            >
              {isSelecting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
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
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Confirming...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <HiCheck className="text-lg" />
                  Confirm Selected Time
                </span>
              )}
            </Button>
            {!hasSelectedSlot && !isDeadlinePassed && (
              <p className="text-xs text-center text-[#1C1C1C60] mt-2">
                Please select a time slot above to continue
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewTimeSlotSelector;
