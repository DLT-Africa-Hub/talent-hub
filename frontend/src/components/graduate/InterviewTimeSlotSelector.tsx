import { useState } from 'react';
import { HiVideoCamera, HiClock, HiCalendar, HiGlobeAlt, HiCheck } from 'react-icons/hi';
import { Button } from '../ui';

// Common timezones
const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Africa/Lagos', label: 'Lagos (WAT)' },
  { value: 'Africa/Cairo', label: 'Cairo (EET)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
];

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

  const formatDuration = (minutes: number) => {
    return minutes === 60 ? '1 hour' : `${minutes} minutes`;
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
      setSuccess('Time slot confirmed! You will receive a confirmation notification.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
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

  return (
    <div className="border border-[#E5E7EB] rounded-2xl bg-white overflow-hidden">
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-button/10 to-[#ADED9A]/20 border-b border-[#E5E7EB]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-button/20 flex items-center justify-center">
              <HiVideoCamera className="text-button text-lg" />
            </div>
            <div>
              <h3 className="font-semibold text-[#1C1C1C]">
                {interview.company?.name || 'Company'}
              </h3>
              <p className="text-sm text-[#1C1C1C80]">
                {interview.job?.title || 'Position'}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
            Awaiting Selection
          </span>
        </div>

        {interview.selectionDeadline && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <HiClock className="text-[#1C1C1C80]" />
            <span className={isDeadlinePassed ? 'text-red-600' : 'text-[#1C1C1C80]'}>
              {isDeadlinePassed
                ? 'Selection deadline has passed'
                : `Select by ${formatDate(interview.selectionDeadline, graduateTimezone)}`}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col gap-4">
        {/* Error/Success messages */}
        {error && (
          <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl border border-green-200 bg-green-50 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Timezone selector */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm font-medium text-[#1C1C1C]">
            <HiGlobeAlt className="text-[#1C1C1C80]" />
            Your Timezone
          </label>
          <select
            value={graduateTimezone}
            onChange={(e) => setGraduateTimezone(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#1C1C1C] focus:border-button focus:ring-1 focus:ring-button outline-none transition"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Time slots */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm font-medium text-[#1C1C1C]">
            <HiCalendar className="text-[#1C1C1C80]" />
            Available Time Slots
          </label>
          <p className="text-xs text-[#1C1C1C80] mb-2">
            Select your preferred interview time
          </p>

          <div className="flex flex-col gap-2">
            {interview.suggestedTimeSlots.map((slot) => {
              const isSelected = selectedSlotId === slot.id;
              const isPast = new Date(slot.date) < new Date();

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => !isPast && setSelectedSlotId(slot.id)}
                  disabled={isPast || isSelecting || !!success}
                  className={`w-full p-4 rounded-xl border-2 text-left transition ${
                    isPast
                      ? 'border-[#E5E7EB] bg-gray-50 opacity-50 cursor-not-allowed'
                      : isSelected
                      ? 'border-button bg-[#DBFFC0]'
                      : 'border-[#E5E7EB] bg-white hover:border-button/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#1C1C1C]">
                          {formatDate(slot.date, graduateTimezone)}
                        </span>
                        {isPast && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs">
                            Passed
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-[#1C1C1C80]">
                        {formatDuration(slot.duration)} • {slot.timezone}
                      </span>
                    </div>
                    {isSelected && !isPast && (
                      <div className="w-6 h-6 rounded-full bg-button flex items-center justify-center">
                        <HiCheck className="text-white text-sm" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirm button */}
        {!success && (
          <Button
            onClick={handleConfirm}
            disabled={!selectedSlotId || isSelecting || isDeadlinePassed}
            className="w-full mt-2"
            variant="primary"
          >
            {isSelecting ? (
              <span className="flex items-center justify-center gap-2">
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
              'Confirm Selected Time'
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default InterviewTimeSlotSelector;

