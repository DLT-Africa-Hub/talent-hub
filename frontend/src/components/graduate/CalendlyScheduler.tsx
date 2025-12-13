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
    <div className="flex flex-col gap-4 p-6 rounded-xl border border-fade bg-white">
      <div className="flex items-center gap-2">
        <HiCalendar className="text-[20px] text-button" />
        <h3 className="text-lg font-semibold text-[#1C1C1C]">
          Schedule Interview
        </h3>
      </div>

      <p className="text-sm text-[#1C1C1C80]">
        Select an available time slot to schedule your interview with the
        company. Date range must be 7 days or less (Calendly API requirement).
      </p>

      {/* Time Range Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            className="bg-gray-100 cursor-not-allowed opacity-60"
            title="Start time is automatically set to 2 hours from now"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1C1C1C] mb-2">
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
          />
        </div>
      </div>

      {/* Event Type Selection */}
      {eventTypes.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[#1C1C1C] mb-2">
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

      {/* Load Availability Button */}
      {startTime && endTime && (
        <Button
          variant="secondary"
          onClick={() => {
            setShouldFetchAvailability(true);
          }}
          disabled={isLoadingAvailability || !startTime || !endTime}
          className="w-full sm:w-auto sm:min-w-[200px] md:min-w-[250px]"
        >
          {isLoadingAvailability ? 'Loading...' : 'Load Available Times'}
        </Button>
      )}

      {/* Available Slots */}
      {isLoadingAvailability ? (
        <LoadingSpinner message="Loading available time slots..." />
      ) : availableSlots && availableSlots.length > 0 ? (
        <div className="flex flex-col gap-2">
          <label className="block text-sm font-medium text-[#1C1C1C] mb-2">
            Available Time Slots
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
            {availableSlots
              .filter((slot: { start_time?: string; end_time?: string }) => {
                if (!slot.start_time) {
                  return false;
                }
                const slotStart = new Date(slot.start_time);
                const isStartValid = !isNaN(slotStart.getTime());

                if (!isStartValid) {
                  return false;
                }
                return true;
              })
              .map((slot: { start_time: string; end_time?: string }) => {
                const slotStart = new Date(slot.start_time);
                // Calculate end_time from start_time + 30 minutes if not provided
                const slotEnd = slot.end_time
                  ? new Date(slot.end_time)
                  : new Date(slotStart.getTime() + 30 * 60 * 1000); // 30 minutes default
                const isSelected = selectedSlot === slot.start_time;

                return (
                  <button
                    key={slot.start_time}
                    type="button"
                    onClick={() => setSelectedSlot(slot.start_time)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-button bg-button/10'
                        : 'border-fade hover:border-button/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <HiClock className="text-[16px] text-[#1C1C1C80]" />
                      <div>
                        <p className="text-sm font-medium text-[#1C1C1C]">
                          {slotStart.toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-[#1C1C1C80]">
                          {slotStart.toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}{' '}
                          -{' '}
                          {slotEnd.toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}
                        </p>
                      </div>
                      {isSelected && (
                        <HiCheckCircle className="text-[20px] text-button ml-auto" />
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      ) : availabilityError ? (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">
            Error loading availability:{' '}
            {availabilityError instanceof Error
              ? availabilityError.message
              : 'Unknown error'}
          </p>
        </div>
      ) : startTime && endTime && shouldFetchAvailability ? (
        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
          <p className="text-sm text-yellow-800">
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
          className="w-full"
        >
          {scheduleMutation.isPending ? 'Scheduling...' : 'Schedule Interview'}
        </Button>
      )}

      {scheduleMutation.isError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">
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
