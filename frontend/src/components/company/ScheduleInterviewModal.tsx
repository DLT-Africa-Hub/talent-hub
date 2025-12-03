import { useState, useEffect } from 'react';
import { HiVideoCamera, HiPlus, HiX, HiClock, HiGlobeAlt } from 'react-icons/hi';
import BaseModal from '../ui/BaseModal';
import { Button, Input } from '../ui';
import { CandidateProfile } from '../../types/candidates';

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

interface TimeSlot {
  id: string;
  date: string;
  duration: number;
}

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  candidate: CandidateProfile | null;
  onClose: () => void;
  onSchedule: (
    candidate: CandidateProfile,
    timeSlots: Array<{ date: string; duration: number }>,
    companyTimezone: string,
    selectionDeadline?: string
  ) => Promise<void>;
  isScheduling?: boolean;
}

const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
  isOpen,
  candidate,
  onClose,
  onSchedule,
  isScheduling = false,
}) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { id: '1', date: '', duration: 30 },
  ]);
  const [companyTimezone, setCompanyTimezone] = useState('UTC');
  const [selectionDeadline, setSelectionDeadline] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTimeSlots([{ id: '1', date: '', duration: 30 }]);
      setCompanyTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
      setSelectionDeadline('');
      setError('');
      setSuccess('');
    } else {
      // Set default timezone based on browser
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const matchingTimezone = COMMON_TIMEZONES.find(tz => tz.value === browserTimezone);
      if (matchingTimezone) {
        setCompanyTimezone(browserTimezone);
      }
    }
  }, [isOpen]);

  if (!candidate) return null;

  const addTimeSlot = () => {
    if (timeSlots.length >= 5) {
      setError('Maximum 5 time slots allowed');
      return;
    }
    setTimeSlots([
      ...timeSlots,
      { id: Date.now().toString(), date: '', duration: 30 },
    ]);
    setError('');
  };

  const removeTimeSlot = (id: string) => {
    if (timeSlots.length === 1) {
      setError('At least one time slot is required');
      return;
    }
    setTimeSlots(timeSlots.filter((slot) => slot.id !== id));
    setError('');
  };

  const updateTimeSlot = (id: string, field: 'date' | 'duration', value: string | number) => {
    setTimeSlots(
      timeSlots.map((slot) =>
        slot.id === id ? { ...slot, [field]: value } : slot
      )
    );
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate all time slots have dates
    const emptySlots = timeSlots.filter((slot) => !slot.date);
    if (emptySlots.length > 0) {
      setError('Please fill in all time slot dates');
      return;
    }

    // Validate dates are in the future
    const now = new Date();
    const pastSlots = timeSlots.filter((slot) => new Date(slot.date) < now);
    if (pastSlots.length > 0) {
      setError('All time slots must be in the future');
      return;
    }

    // Validate deadline if provided
    if (selectionDeadline && new Date(selectionDeadline) < now) {
      setError('Selection deadline must be in the future');
      return;
    }

    try {
      await onSchedule(
        candidate,
        timeSlots.map((slot) => ({ date: slot.date, duration: slot.duration })),
        companyTimezone,
        selectionDeadline || undefined
      );
      setSuccess('Interview time slots sent successfully! The candidate will be notified.');
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        error?.response?.data?.message ||
        error?.message ||
        'Failed to send time slots. Please try again.'
      );
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-button/10 flex items-center justify-center">
            <HiVideoCamera className="text-button text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#1C1C1C]">
              Schedule Interview
            </h2>
            <p className="text-sm text-[#1C1C1C80]">
              with {candidate.name}
            </p>
          </div>
        </div>

        {/* Info banner */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800">
            <strong>Multiple Time Slots:</strong> Suggest up to 5 time options.
            The candidate will choose their preferred time, and you'll be notified
            when they confirm.
          </p>
        </div>

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

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Timezone Selection */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-[#1C1C1C]">
              <HiGlobeAlt className="text-[#1C1C1C80]" />
              Your Timezone
            </label>
            <select
              value={companyTimezone}
              onChange={(e) => setCompanyTimezone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-white text-[#1C1C1C] focus:border-button focus:ring-1 focus:ring-button outline-none transition"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time Slots */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-[#1C1C1C]">
              <HiClock className="text-[#1C1C1C80]" />
              Suggested Time Slots
            </label>

            <div className="flex flex-col gap-3">
              {timeSlots.map((slot, index) => (
                <div
                  key={slot.id}
                  className="flex items-center gap-3 p-4 bg-[#F8F8F8] rounded-xl border border-fade"
                >
                  <span className="text-sm font-medium text-[#1C1C1C80] w-6">
                    {index + 1}.
                  </span>
                  
                  <div className="flex-1">
                    <Input
                      type="datetime-local"
                      value={slot.date}
                      onChange={(e) => updateTimeSlot(slot.id, 'date', e.target.value)}
                      className="w-full"
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    {[15, 30, 45, 60].map((duration) => (
                      <button
                        key={duration}
                        type="button"
                        onClick={() => updateTimeSlot(slot.id, 'duration', duration)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                          slot.duration === duration
                            ? 'bg-button text-white'
                            : 'bg-white border border-[#E5E7EB] text-[#1C1C1C80] hover:border-button'
                        }`}
                      >
                        {duration === 60 ? '1h' : `${duration}m`}
                      </button>
                    ))}
                  </div>

                  {timeSlots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(slot.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      <HiX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {timeSlots.length < 5 && (
              <button
                type="button"
                onClick={addTimeSlot}
                className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#E5E7EB] rounded-xl text-[#1C1C1C80] hover:border-button hover:text-button transition"
              >
                <HiPlus className="w-4 h-4" />
                Add Another Time Slot
              </button>
            )}
          </div>

          {/* Optional: Selection Deadline */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#1C1C1C]">
              Selection Deadline (Optional)
            </label>
            <Input
              type="datetime-local"
              value={selectionDeadline}
              onChange={(e) => setSelectionDeadline(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-[#1C1C1C80]">
              Set a deadline for the candidate to select a time slot
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={isScheduling}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 flex items-center justify-center gap-2"
              disabled={isScheduling}
            >
              {isScheduling ? (
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
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <HiVideoCamera />
                  Send Time Slots
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
};

export default ScheduleInterviewModal;

