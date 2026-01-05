import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HiCalendar, HiClock, HiCheckCircle } from 'react-icons/hi2';
import { graduateApi } from '../../api/graduate';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Select } from '../ui';
import { LoadingSpinner } from '../../index';

interface CalendlySchedulerProps {
  applicationId: string;
  candidateName?: string;
  onSuccess?: () => void;
}

const CalendlyScheduler = ({
  applicationId,
  candidateName,
  onSuccess,
}: CalendlySchedulerProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [eventTypeUri, setEventTypeUri] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [shouldFetchAvailability, setShouldFetchAvailability] = useState(false);

  // Fetch graduate profile to get email
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['graduateProfile'],
    queryFn: async () => {
      const response = await graduateApi.getProfile();
      return response;
    },
    enabled: !user?.email, // Only fetch if email is not in auth context
  });

  // Get available time slots
  const {
    data: availability,
    isLoading: isLoadingAvailability,
    error: availabilityError,
  } = useQuery({
    queryKey: [
      'calendlyAvailability',
      applicationId,
      startTime,
      endTime,
      eventTypeUri,
    ],
    queryFn: async () => {
      const params: {
        startTime?: string;
        endTime?: string;
        eventTypeUri?: string;
      } = {};

      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;
      if (eventTypeUri) params.eventTypeUri = eventTypeUri;

      const response = await graduateApi.getCalendlyAvailability(
        applicationId,
        params
      );
      return response;
    },
    enabled:
      !!applicationId && !!startTime && !!endTime && shouldFetchAvailability,
  });

  const scheduleMutation = useMutation({
    mutationFn: async (payload: {
      eventTypeUri: string;
      startTime: string;
      inviteeEmail: string;
      inviteeName?: string;
      location?: string;
    }) => {
      return graduateApi.scheduleCalendlyInterview(applicationId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graduateApplications'] });
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      onSuccess?.();
    },
  });

  // Set default time range
  useEffect(() => {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const sevenDaysFromStart = new Date(
      twoHoursFromNow.getTime() + 7 * 24 * 60 * 60 * 1000
    );
    setStartTime(twoHoursFromNow.toISOString());
    setEndTime(sevenDaysFromStart.toISOString());
  }, []);

  // Get candidate email from profile or auth context
  const candidateEmail =
    user?.email ||
    (profileData?.graduate?.userId as { email?: string })?.email ||
    '';

  const availableSlots = useMemo(
    () => availability?.availableSlots || [],
    [availability?.availableSlots]
  );
  const eventTypes = useMemo(
    () => availability?.eventTypes || [],
    [availability?.eventTypes]
  );
  const companyTimezone =
    availability?.companyTimezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Auto-select "30 Minute Meeting" by default when event types are loaded
  useEffect(() => {
    if (eventTypes.length > 0 && !eventTypeUri) {
      const thirtyMinuteMeeting = eventTypes.find(
        (et: { uri: string; name: string }) =>
          et.name.toLowerCase().includes('30') &&
          et.name.toLowerCase().includes('minute')
      );

      if (thirtyMinuteMeeting) {
        setEventTypeUri(thirtyMinuteMeeting.uri);
      } else if (eventTypes.length > 0) {
        // Fallback to first event type if no 30-minute meeting found
        setEventTypeUri(eventTypes[0].uri);
      }
    }
  }, [eventTypes, eventTypeUri]);

  const handleSchedule = () => {
    if (!selectedSlot || !eventTypeUri || !candidateEmail) {
      return;
    }

    scheduleMutation.mutate({
      eventTypeUri,
      startTime: selectedSlot,
      inviteeEmail: candidateEmail,
      inviteeName: candidateName,
    });
  };

  // Group slots by day - MUST be before any conditional returns
  const slotsByDay = useMemo(() => {
    if (!availableSlots || availableSlots.length === 0) return {};

    const grouped: Record<
      string,
      Array<{ start_time: string; end_time?: string }>
    > = {};

    availableSlots
      .filter((slot: { start_time?: string; end_time?: string }) => {
        if (!slot.start_time) return false;
        const slotStart = new Date(slot.start_time);
        return !isNaN(slotStart.getTime());
      })
      .forEach((slot: { start_time: string; end_time?: string }) => {
        const slotStart = new Date(slot.start_time);
        const dayKey = slotStart.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: companyTimezone,
        });

        if (!grouped[dayKey]) {
          grouped[dayKey] = [];
        }
        grouped[dayKey].push(slot);
      });

    return grouped;
  }, [availableSlots, companyTimezone]);

  // Get unique days sorted chronologically
  const availableDays = useMemo(() => {
    return Object.keys(slotsByDay).sort((a, b) => {
      const dateA = new Date(a.split('/').reverse().join('-'));
      const dateB = new Date(b.split('/').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    });
  }, [slotsByDay]);

  // Show loading state while fetching profile
  if (isLoadingProfile && !user?.email) {
    return (
      <div className="p-4 rounded-lg bg-white border border-fade">
        <LoadingSpinner message="Loading profile..." />
      </div>
    );
  }

  // Show error if email is still not available
  if (!candidateEmail) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200">
        <p className="text-sm text-red-800">
          Unable to retrieve candidate email. Please try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 rounded-2xl border border-fade bg-linear-to-br from-white to-gray-50/50 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-linear-to-br from-button/20 to-button/10 flex items-center justify-center">
          <HiCalendar className="text-[24px] text-button" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#1C1C1C]">
            Schedule Interview
          </h3>
          <p className="text-xs text-[#1C1C1C80] mt-0.5">
            Choose your preferred time slot
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 p-6 rounded-2xl border border-gray-200/60 shadow-sm">
        <div className="flex flex-col">
          <label className="block text-sm font-semibold text-[#1C1C1C] mb-2.5">
            Start Date
          </label>
          <Input
            type="datetime-local"
            value={
              startTime ? new Date(startTime).toISOString().slice(0, 16) : ''
            }
            onChange={(e) => {
              const date = new Date(e.target.value);
              setStartTime(date.toISOString());
            }}
            disabled
            className="bg-white border-gray-300 cursor-not-allowed opacity-60 h-12 text-[15px] font-medium"
            title="Start time is automatically set to 2 hours from now"
          />
          <p className="text-xs text-[#1C1C1C60] mt-1.5">
            Auto-set to 2 hours from now
          </p>
        </div>

        <div className="flex flex-col">
          <label className="block text-sm font-semibold text-[#1C1C1C] mb-2.5">
            End Date
          </label>
          <Input
            type="datetime-local"
            value={endTime ? new Date(endTime).toISOString().slice(0, 16) : ''}
            onChange={(e) => {
              const date = new Date(e.target.value);
              const newEndTime = date.toISOString();

              // Validate: date range cannot exceed 7 days (Calendly API limit)
              if (startTime) {
                const start = new Date(startTime);
                const end = new Date(newEndTime);
                const daysDiff =
                  (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

                if (daysDiff > 7) {
                  // Limit to exactly 7 days from start time
                  const maxEndTime = new Date(
                    start.getTime() + 7 * 24 * 60 * 60 * 1000
                  );
                  setEndTime(maxEndTime.toISOString());
                  return;
                }

                if (daysDiff < 0) {
                  // End time cannot be before start time
                  setEndTime(start.toISOString());
                  return;
                }
              }

              setEndTime(newEndTime);
            }}
            className="bg-white border-gray-300 h-12 text-[15px] font-medium focus:border-button focus:ring-2 focus:ring-button/20 transition-all"
          />
          <p className="text-xs text-[#1C1C1C60] mt-1.5">
            Max 7 days from start
          </p>
        </div>
        {eventTypes.length > 0 && (
          <div className="flex flex-col">
            <label className="block text-sm font-semibold text-[#1C1C1C] mb-2.5">
              Meeting Type
            </label>
            <Select
              value={eventTypeUri}
              onChange={(e) => setEventTypeUri(e.target.value)}
              options={eventTypes.map((et: { uri: string; name: string }) => ({
                value: et.uri,
                label: et.name,
              }))}
              placeholder="Select meeting type"
            />
          </div>
        )}
      </div>

      {startTime && endTime && (
        <div className="flex justify-start pt-2 my-6">
          <Button
            variant="primary"
            onClick={() => {
              setShouldFetchAvailability(true);
            }}
            disabled={isLoadingAvailability || !startTime || !endTime}
            className="min-w-[220px] h-12 text-[15px] font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoadingAvailability ? (
              <span className="flex items-center gap-2.5">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Loading Available Times...
              </span>
            ) : (
              <span className="flex items-center gap-2.5">
                <HiCalendar className="text-[18px]" />
                Load Available Times
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Available Slots - Grouped by Day */}
      {isLoadingAvailability ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner message="Loading available time slots..." />
        </div>
      ) : availableSlots && availableSlots.length > 0 ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-button/15 to-button/5 flex items-center justify-center">
                <HiClock className="text-[20px] text-button" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-[#1C1C1C] tracking-tight">
                  Available Time Slots
                </h4>
                <p className="text-xs text-[#1C1C1C80] mt-0.5 font-medium">
                  Select your preferred time
                </p>
              </div>
            </div>
            <span className="px-4 py-2 rounded-xl bg-button/10 text-button text-sm font-bold border border-button/20">
              {availableSlots.length}{' '}
              {availableSlots.length === 1 ? 'slot' : 'slots'}
            </span>
          </div>
          <div className="flex flex-col gap-6 max-h-[600px] overflow-y-auto pr-3 custom-scrollbar">
            {availableDays.map((dayKey: string) => {
              const slots = slotsByDay[dayKey];
              if (!slots || slots.length === 0) return null;

              const firstSlot = new Date(slots[0].start_time);
              const weekdayName = firstSlot.toLocaleDateString('en-GB', {
                weekday: 'long',
                timeZone: companyTimezone,
              });
              const dayNumber = firstSlot.getDate();
              const monthName = firstSlot.toLocaleDateString('en-GB', {
                month: 'short',
                timeZone: companyTimezone,
              });
              const fullDate = firstSlot.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: companyTimezone,
              });

              // Format time slots for dropdown
              const timeSlotOptions = slots.map(
                (slot: { start_time: string; end_time?: string }) => {
                  const slotStart = new Date(slot.start_time);
                  const slotEnd = slot.end_time
                    ? new Date(slot.end_time)
                    : new Date(slotStart.getTime() + 30 * 60 * 1000);
                  const duration = Math.round(
                    (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60)
                  );
                  const startTimeFormatted = slotStart.toLocaleTimeString(
                    'en-GB',
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: companyTimezone,
                    }
                  );
                  const endTimeFormatted = slotEnd.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: companyTimezone,
                  });

                  return {
                    value: slot.start_time,
                    label: `${startTimeFormatted} - ${endTimeFormatted} (${duration} min)`,
                  };
                }
              );

              // Find if any slot from this day is selected
              const selectedSlotForDay = selectedSlot
                ? slots.find(
                    (slot: { start_time: string }) =>
                      slot.start_time === selectedSlot
                  )
                  ? selectedSlot
                  : ''
                : '';

              return (
                <div
                  key={dayKey}
                  className="flex flex-col gap-4 p-5 rounded-2xl border border-gray-200/60 bg-linear-to-br from-white to-gray-50/30 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Day Header */}
                  <div className="flex items-center gap-4 pb-3 border-b border-gray-200/60">
                    <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-linear-to-br from-button/20 via-button/15 to-button/10 border-2 border-button/30 shadow-sm">
                      <span className="text-2xl font-bold text-button leading-none">
                        {dayNumber}
                      </span>
                      <span className="text-[10px] font-bold text-button/90 uppercase tracking-wide mt-0.5">
                        {monthName}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h5 className="text-lg font-bold text-[#1C1C1C] capitalize tracking-tight">
                        {weekdayName}
                      </h5>
                      <p className="text-sm text-[#1C1C1C80] mt-0.5 font-medium">
                        {fullDate} • {slots.length}{' '}
                        {slots.length === 1 ? 'time slot' : 'time slots'}
                      </p>
                    </div>
                  </div>

                  {/* Time Slots Dropdown */}
                  <Select
                    value={selectedSlotForDay}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedSlot(value || null);
                    }}
                    options={timeSlotOptions}
                    placeholder={`Select a time slot (${slots.length} available)`}
                    className="h-12 text-[15px] font-medium"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : availabilityError ? (
        <div className="p-4 rounded-xl bg-red-50 border-2 border-red-200">
          <p className="text-sm text-red-800 font-medium">
            Error loading availability:{' '}
            {availabilityError instanceof Error
              ? availabilityError.message
              : 'Unknown error'}
          </p>
        </div>
      ) : startTime && endTime && shouldFetchAvailability ? (
        <div className="p-4 rounded-xl bg-yellow-50 border-2 border-yellow-200">
          <p className="text-sm text-yellow-800 font-medium">
            No available time slots found for the selected date range (max 7
            days). Try selecting a different range.
          </p>
        </div>
      ) : null}

      {/* Schedule Button */}
      {selectedSlot && eventTypeUri && candidateEmail && (
        <div className="pt-4 border-t border-gray-200">
          <Button
            variant="primary"
            onClick={handleSchedule}
            disabled={scheduleMutation.isPending}
            className="w-full h-14 text-base font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
          >
            {scheduleMutation.isPending ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Scheduling Interview...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                <HiCheckCircle className="text-[22px]" />
                Confirm & Schedule Interview
              </span>
            )}
          </Button>
        </div>
      )}

      {scheduleMutation.isError && scheduleMutation.error && (
        <div className="p-4 rounded-xl bg-red-50 border-2 border-red-200">
          <p className="text-sm text-red-800 font-medium">
            {scheduleMutation.error instanceof Error
              ? scheduleMutation.error.message
              : 'Failed to schedule interview. Please try again.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default CalendlyScheduler;
