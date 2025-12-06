import { useState, useEffect } from 'react';
import { HiPlus, HiX } from 'react-icons/hi';
import BaseModal from '../ui/BaseModal';
import { Button, Input } from '../ui';
import { CandidateProfile } from '../../types/candidates';
import { COMMON_TIMEZONES } from '../../constants/timezones';

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
    if (isOpen) {
      // Set default timezone based on browser
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const matchingTimezone = COMMON_TIMEZONES.find(
        (tz) => tz.value === browserTimezone
      );
      setCompanyTimezone(matchingTimezone ? browserTimezone : 'UTC');
    } else {
      setTimeSlots([{ id: '1', date: '', duration: 30 }]);
      setCompanyTimezone('UTC');
      setSelectionDeadline('');
      setError('');
      setSuccess('');
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

  const updateTimeSlot = (
    id: string,
    field: 'date' | 'duration',
    value: string | number
  ) => {
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
      setSuccess(
        'Interview time slots sent successfully! The candidate will be notified.'
      );
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to send time slots. Please try again.'
      );
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-[#1C1C1C]">
            Schedule Interview with {candidate.name}
          </h2>
          <p className="text-sm text-[#1C1C1C80] mt-1">
            Suggest up to 5 time slots. The candidate will choose their
            preferred time.
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Time Slots */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-[#1C1C1C]">
              Available Time Slots
            </label>

            <div className="flex flex-col gap-3">
              {timeSlots.map((slot, index) => (
                <div
                  key={slot.id}
                  className="flex items-center gap-3 p-3 bg-[#F8F8F8] rounded-xl border border-fade"
                >
                  <span className="text-sm font-medium text-[#1C1C1C80] min-w-[24px]">
                    {index + 1}.
                  </span>

                  <Input
                    type="datetime-local"
                    value={slot.date}
                    onChange={(e) =>
                      updateTimeSlot(slot.id, 'date', e.target.value)
                    }
                    className="flex-1"
                    required
                    placeholder="Select date & time"
                  />

                  <select
                    value={slot.duration}
                    onChange={(e) =>
                      updateTimeSlot(
                        slot.id,
                        'duration',
                        Number(e.target.value)
                      )
                    }
                    className="px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#1C1C1C] focus:border-button focus:ring-1 focus:ring-button outline-none"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hour</option>
                  </select>

                  {timeSlots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(slot.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                      aria-label="Remove time slot"
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
                className="flex items-center justify-center gap-2 py-2 text-sm text-[#1C1C1C80] hover:text-button transition"
              >
                <HiPlus className="w-4 h-4" />
                Add another time slot
              </button>
            )}
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-[#1C1C1C80] hover:text-[#1C1C1C]">
              Advanced Options
            </summary>
            <div className="mt-3 space-y-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#1C1C1C]">
                  Your Timezone
                </label>
                <select
                  value={companyTimezone}
                  onChange={(e) => setCompanyTimezone(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#1C1C1C] focus:border-button focus:ring-1 focus:ring-button outline-none"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

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
              </div>
            </div>
          </details>

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
              className="flex-1"
              disabled={isScheduling}
            >
              {isScheduling ? 'Sending...' : 'Send Time Slots'}
            </Button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
};

export default ScheduleInterviewModal;
