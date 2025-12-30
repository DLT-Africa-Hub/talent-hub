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

  // Get unique days for calendar preview - MUST be before any conditional returns
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
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      {/* Left Side - Main Scheduling Card */}
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

        {/* Time Range and Meeting Type Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-white/80 backdrop-blur-sm p-5 rounded-xl border border-gray-200/50 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-2">
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
              className="bg-white cursor-not-allowed opacity-60"
              title="Start time is automatically set to 2 hours from now"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-2">
              End Date
            </label>
            <Input
              type="datetime-local"
              value={
                endTime ? new Date(endTime).toISOString().slice(0, 16) : ''
              }
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
              className="bg-white"
            />
          </div>
          {eventTypes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-2">
                Meeting Type
              </label>
              <Select
                value={eventTypeUri}
                onChange={(e) => setEventTypeUri(e.target.value)}
                options={eventTypes.map(
                  (et: { uri: string; name: string }) => ({
                    value: et.uri,
                    label: et.name,
                  })
                )}
                placeholder="Select meeting type"
              />
            </div>
          )}
        </div>

        {/* Load Availability Button */}
        {startTime && endTime && (
          <div className="flex justify-start">
            <Button
              variant="secondary"
              onClick={() => {
                setShouldFetchAvailability(true);
              }}
              disabled={isLoadingAvailability || !startTime || !endTime}
              className="min-w-[200px] shadow-md hover:shadow-lg transition-shadow"
            >
              {isLoadingAvailability ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
                  Loading...
                </span>
              ) : (
                <span className="flex items-center gap-2">
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
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <HiClock className="text-[20px] text-button" />
              <h4 className="text-lg font-bold text-[#1C1C1C]">
                Available Time Slots
              </h4>
              <span className="ml-auto px-3 py-1 rounded-full bg-button/10 text-button text-xs font-semibold">
                {availableSlots.length} slots
              </span>
            </div>
            <div className="flex flex-col gap-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(slotsByDay).map(([dayKey, slots]) => {
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

                return (
                  <div key={dayKey} className="flex flex-col gap-3">
                    {/* Day Header */}
                    <div className="flex items-center gap-3 pb-2 border-b-2 border-gray-200">
                      <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-linear-to-br from-button/20 to-button/10 border-2 border-button/30">
                        <span className="text-2xl font-bold text-button">
                          {dayNumber}
                        </span>
                        <span className="text-xs font-semibold text-button/80 uppercase">
                          {monthName}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h5 className="text-base font-bold text-[#1C1C1C] capitalize">
                          {weekdayName}
                        </h5>
                        <p className="text-xs text-[#1C1C1C80]">
                          {slots.length} available{' '}
                          {slots.length === 1 ? 'slot' : 'slots'}
                        </p>
                      </div>
                    </div>

                    {/* Time Slots for this Day */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {slots.map(
                        (slot: { start_time: string; end_time?: string }) => {
                          const slotStart = new Date(slot.start_time);
                          const slotEnd = slot.end_time
                            ? new Date(slot.end_time)
                            : new Date(slotStart.getTime() + 30 * 60 * 1000);
                          const isSelected = selectedSlot === slot.start_time;
                          const timeRange = `${slotStart.toLocaleTimeString(
                            'en-GB',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                              timeZone: companyTimezone,
                            }
                          )}-${slotEnd.toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                            timeZone: companyTimezone,
                          })}`;

                          return (
                            <button
                              key={slot.start_time}
                              type="button"
                              onClick={() => setSelectedSlot(slot.start_time)}
                              className={`group relative p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                                isSelected
                                  ? 'border-button bg-linear-to-br from-button/15 to-button/5 shadow-lg scale-[1.02]'
                                  : 'border-gray-200 bg-white hover:border-button/50 hover:shadow-md hover:bg-linear-to-br hover:from-gray-50 hover:to-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    isSelected
                                      ? 'bg-button text-white'
                                      : 'bg-gray-100 text-gray-600 group-hover:bg-button/10 group-hover:text-button'
                                  } transition-colors`}
                                >
                                  <HiClock className="text-[18px]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-sm font-bold ${
                                      isSelected
                                        ? 'text-button'
                                        : 'text-[#1C1C1C]'
                                    }`}
                                  >
                                    {timeRange}
                                  </p>
                                  <p className="text-xs text-[#1C1C1C80] mt-0.5">
                                    {slotEnd.getTime() - slotStart.getTime() ===
                                    30 * 60 * 1000
                                      ? '30 min'
                                      : 'Custom duration'}
                                  </p>
                                </div>
                                {isSelected && (
                                  <HiCheckCircle className="text-[24px] text-button shrink-0" />
                                )}
                              </div>
                            </button>
                          );
                        }
                      )}
                    </div>
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
          <Button
            variant="primary"
            onClick={handleSchedule}
            disabled={scheduleMutation.isPending}
            className="w-full py-4 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {scheduleMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
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
                Scheduling...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <HiCheckCircle className="text-[20px]" />
                Confirm & Schedule Interview
              </span>
            )}
          </Button>
        )}

        {scheduleMutation.isError && (
          <div className="p-4 rounded-xl bg-red-50 border-2 border-red-200">
            <p className="text-sm text-red-800 font-medium">
              {scheduleMutation.error instanceof Error
                ? scheduleMutation.error.message
                : 'Failed to schedule interview. Please try again.'}
            </p>
          </div>
        )}
      </div>

      {/* Right Side - Calendar Preview & Summary */}
      {availableDays.length > 0 && (
        <div className="lg:w-80 xl:w-96 shrink-0">
          <div className="sticky top-6 flex flex-col gap-4 p-6 rounded-2xl border border-fade bg-linear-to-br from-button/5 to-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <HiCalendar className="text-[20px] text-button" />
              <h4 className="text-lg font-bold text-[#1C1C1C]">Quick View</h4>
            </div>

            {/* Selected Slot Summary */}
            {selectedSlot && (
              <div className="p-4 rounded-xl bg-linear-to-br from-button/10 to-button/5 border-2 border-button/30 mb-4">
                <p className="text-xs font-semibold text-button/80 uppercase tracking-wide mb-2">
                  Selected Slot
                </p>
                <p className="text-sm font-bold text-[#1C1C1C]">
                  {new Date(selectedSlot).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    timeZone: companyTimezone,
                  })}
                </p>
                <p className="text-sm text-[#1C1C1C80] mt-1">
                  {new Date(selectedSlot).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    timeZone: companyTimezone,
                  })}
                </p>
              </div>
            )}

            {/* Available Days List */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-[#1C1C1C80] uppercase tracking-wide">
                Available Days ({availableDays.length})
              </p>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                {availableDays.map((dayKey) => {
                  const date = new Date(dayKey.split('/').reverse().join('-'));
                  const weekdayName = date.toLocaleDateString('en-GB', {
                    weekday: 'short',
                    timeZone: companyTimezone,
                  });
                  const dayNumber = date.getDate();
                  const monthName = date.toLocaleDateString('en-GB', {
                    month: 'short',
                    timeZone: companyTimezone,
                  });
                  const slotCount = slotsByDay[dayKey]?.length || 0;

                  return (
                    <div
                      key={dayKey}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200 hover:border-button/50 hover:shadow-sm transition-all"
                    >
                      <div className="w-12 h-12 rounded-lg bg-linear-to-br from-button/20 to-button/10 flex flex-col items-center justify-center border border-button/30">
                        <span className="text-lg font-bold text-button">
                          {dayNumber}
                        </span>
                        <span className="text-[10px] font-semibold text-button/80 uppercase">
                          {monthName}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1C1C1C] capitalize">
                          {weekdayName}
                        </p>
                        <p className="text-xs text-[#1C1C1C80]">
                          {slotCount} {slotCount === 1 ? 'slot' : 'slots'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-4 p-3 rounded-lg bg-blue-50/50 border border-blue-200/50">
              <p className="text-xs text-[#1C1C1C80] leading-relaxed">
                💡 <span className="font-semibold">Tip:</span> Select a time
                slot from the left to schedule your interview. Make sure you're
                available at the chosen time.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendlyScheduler;
