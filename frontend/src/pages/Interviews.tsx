import { useMemo, useState, useRef, useEffect } from 'react';
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { companyApi } from '../api/company';
import { graduateApi } from '../api/graduate';
import { adminApi } from '../api/admin';
import {
  Button,
  EmptyState,
  PageLoader,
  SectionHeader,
} from '../components/ui';
import { ApiError, ApiApplication } from '../types/api';
import InterviewTimeSlotSelector, {
  PendingInterview,
} from '../components/graduate/InterviewTimeSlotSelector';
import CalendlyScheduler from '../components/graduate/CalendlyScheduler';

type InterviewRecord = {
  id: string;
  applicationId?: string;
  scheduledAt: string;
  status: string;
  durationMinutes?: number;
  roomSlug?: string;
  roomUrl?: string;
  job?: {
    id?: string;
    title?: string;
    location?: string;
    jobType?: string;
    companyName?: string;
  };
  participant?: {
    name?: string;
    role?: string;
    rank?: string;
    avatar?: string;
  };
};

const JOIN_WINDOW_MINUTES = 10;
const JOIN_GRACE_MINUTES = 90;
const ROLE_COMPANY = 'company';
const ROLE_GRADUATE = 'graduate';

const formatDateTime = (value?: string) => {
  if (!value) return ' — ';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const Interviews = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userRole = user?.role;
  const isCompany = userRole === ROLE_COMPANY;
  const isGraduate = userRole === ROLE_GRADUATE;
  const isAdmin = userRole === 'admin';
  const [selectingInterviewId, setSelectingInterviewId] = useState<
    string | null
  >(null);

  // Fetch upcoming interviews (all at once)
  const { data, isLoading, error } = useQuery({
    queryKey: ['interviews', userRole, 'upcoming'],
    queryFn: async () => {
      if (isCompany) {
        return companyApi.getInterviews({
          page: 1,
          limit: 100,
          upcoming: 'true',
        });
      }
      if (isAdmin) {
        return adminApi.getInterviews({
          page: 1,
          limit: 100,
          upcoming: 'true',
        });
      }
      return graduateApi.getInterviews({
        page: 1,
        limit: 100,
        upcoming: 'true',
      });
    },
  });

  // Fetch past interviews with infinite scrolling (5 per page)
  const {
    data: pastData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingPast,
  } = useInfiniteQuery({
    queryKey: ['interviews', userRole, 'past'],
    queryFn: async ({ pageParam = 1 }) => {
      if (isCompany) {
        return companyApi.getInterviews({
          page: pageParam,
          limit: 5,
          upcoming: 'false',
        });
      }
      if (isAdmin) {
        return adminApi.getInterviews({
          page: pageParam,
          limit: 5,
          upcoming: 'false',
        });
      }
      return graduateApi.getInterviews({
        page: pageParam,
        limit: 5,
        upcoming: 'false',
      });
    },
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      if (pagination && pagination.page < pagination.pages) {
        return pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['interviews', 'pending-selection'],
    queryFn: () => graduateApi.getPendingSelectionInterviews(),
    enabled: isGraduate,
  });

  // Fetch applications for Calendly scheduling (graduates only)
  const { data: applicationsData } = useQuery({
    queryKey: ['graduateApplications', 'calendly'],
    queryFn: async () => {
      const response = await graduateApi.getApplications({
        page: 1,
        limit: 100,
      });
      return response.applications || [];
    },
    enabled: isGraduate,
  });

  // Filter applications with Calendly-enabled companies and no scheduled interview
  const calendlyApplications = useMemo(() => {
    if (!isGraduate || !applicationsData) return [];

    return applicationsData.filter((app: ApiApplication) => {
      // Check if company has Calendly enabled
      const hasCalendly = app.jobId?.companyId?.calendly?.enabled;

      // Check if there's no scheduled interview yet
      const hasNoInterview = !app.interviewId && !app.interviewScheduledAt;

      // Only show for accepted/shortlisted applications
      const eligibleStatus =
        app.status &&
        ['accepted', 'shortlisted', 'reviewed'].includes(app.status);

      return hasCalendly && hasNoInterview && eligibleStatus && app._id;
    });
  }, [applicationsData, isGraduate]);

  const selectSlotMutation = useMutation({
    mutationFn: async ({
      interviewId,
      slotId,
      graduateTimezone,
    }: {
      interviewId: string;
      slotId: string;
      graduateTimezone: string;
    }) => {
      return graduateApi.selectTimeSlot(interviewId, {
        slotId,
        graduateTimezone,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      setSelectingInterviewId(null);
    },
  });

  const handleSelectSlot = async (
    interviewId: string,
    slotId: string,
    graduateTimezone: string
  ) => {
    setSelectingInterviewId(interviewId);
    await selectSlotMutation.mutateAsync({
      interviewId,
      slotId,
      graduateTimezone,
    });
  };

  const pendingInterviews: PendingInterview[] = pendingData?.interviews ?? [];

  // Upcoming interviews from the query - filter out completed ones
  const upcoming = useMemo(() => {
    const interviews = (data?.interviews ?? []) as InterviewRecord[];
    const now = Date.now();
    return interviews
      .filter((interview) => {
        // Filter out completed interviews
        if (interview.status === 'completed') return false;

        // Filter out interviews that have passed their end time
        if (interview.scheduledAt) {
          const scheduledTime = new Date(interview.scheduledAt).getTime();
          const durationMs = (interview.durationMinutes || 30) * 60 * 1000;
          const endTime = scheduledTime + durationMs;
          if (!Number.isNaN(scheduledTime) && endTime < now) {
            return false;
          }
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(a.scheduledAt || 0).getTime() -
          new Date(b.scheduledAt || 0).getTime()
      );
  }, [data?.interviews]);

  // Past interviews from infinite query (flatten pages) + completed from upcoming
  const past = useMemo(() => {
    const allPast: InterviewRecord[] = [];

    // Add interviews from past query
    if (pastData?.pages) {
      pastData.pages.forEach((page) => {
        if (page.interviews) {
          allPast.push(...(page.interviews as InterviewRecord[]));
        }
      });
    }

    // Add completed interviews from upcoming query
    const interviews = (data?.interviews ?? []) as InterviewRecord[];
    const now = Date.now();
    interviews.forEach((interview) => {
      // Include if status is completed
      if (interview.status === 'completed') {
        allPast.push(interview);
        return;
      }

      // Include if interview has passed its end time
      if (interview.scheduledAt) {
        const scheduledTime = new Date(interview.scheduledAt).getTime();
        const durationMs = (interview.durationMinutes || 30) * 60 * 1000;
        const endTime = scheduledTime + durationMs;
        if (!Number.isNaN(scheduledTime) && endTime < now) {
          allPast.push(interview);
        }
      }
    });

    // Remove duplicates (in case an interview appears in both queries)
    const uniquePast = Array.from(
      new Map(allPast.map((item) => [item.id, item])).values()
    );

    return uniquePast.sort(
      (a, b) =>
        new Date(b.scheduledAt || 0).getTime() -
        new Date(a.scheduledAt || 0).getTime()
    );
  }, [pastData?.pages, data?.interviews]);

  // Intersection observer for infinite scrolling
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const canJoinInterview = (scheduledAt?: string, isPast: boolean = false) => {
    // Past interviews are never joinable
    if (isPast) return false;

    if (!scheduledAt) return false;
    const scheduledTime = new Date(scheduledAt).getTime();
    if (Number.isNaN(scheduledTime)) return false;
    const now = Date.now();
    const windowStart = scheduledTime - JOIN_WINDOW_MINUTES * 60 * 1000;
    const windowEnd = scheduledTime + JOIN_GRACE_MINUTES * 60 * 1000;
    return now >= windowStart && now <= windowEnd;
  };

  const handleJoin = (roomSlug?: string) => {
    if (roomSlug) {
      navigate(`/interviews/${roomSlug}`);
    }
  };

  const renderInterviewCard = (
    interview: InterviewRecord,
    isPast: boolean = false
  ) => {
    const joinable = canJoinInterview(interview.scheduledAt, isPast);
    const counterpartName = isCompany
      ? interview.participant?.name || 'Candidate'
      : isAdmin
        ? interview.participant?.name || 'Candidate'
        : interview.job?.companyName || 'Company';
    const actionLabel =
      isCompany || isAdmin ? 'Start Interview' : 'Join Interview';

    // Determine display status: if interview is in the past, show "completed"
    const getDisplayStatus = () => {
      if (isPast) {
        return 'completed';
      }
      // Check if scheduledAt is in the past (even if not marked as past in query)
      if (interview.scheduledAt) {
        const scheduledTime = new Date(interview.scheduledAt).getTime();
        const durationMs = (interview.durationMinutes || 30) * 60 * 1000;
        const endTime = scheduledTime + durationMs;
        if (!Number.isNaN(scheduledTime) && endTime < Date.now()) {
          return 'completed';
        }
      }
      return interview.status;
    };

    const displayStatus = getDisplayStatus();

    return (
      <div
        key={interview.id}
        className="flex flex-col gap-4 border border-fade rounded-2xl p-4 bg-white shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <p className="text-sm text-[#1C1C1C80]">
            {isCompany || isAdmin ? 'Candidate' : 'Company'}
          </p>
          <p className="text-lg font-semibold text-[#1C1C1C]">
            {counterpartName}
          </p>
          {interview.job?.title && (
            <p className="text-sm text-[#1C1C1C80]">{interview.job?.title}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-[#1C1C1C80]">
          <span className="px-3 py-1 rounded-full bg-[#F8F8F8] border border-fade">
            {formatDateTime(interview.scheduledAt)}
          </span>
          {displayStatus && (
            <span
              className={`px-3 py-1 rounded-full border ${
                displayStatus === 'completed'
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : displayStatus === 'pending_selection'
                    ? 'bg-purple-100 text-purple-800 border-purple-200'
                    : 'bg-[#E8F1FF] text-[#1B5F77] border-[#1B5F7722]'
              }`}
            >
              {displayStatus.replace('_', ' ')}
            </span>
          )}
          {interview.job?.location && (
            <span className="px-3 py-1 rounded-full bg-[#F8F8F8] border border-fade">
              {interview.job.location}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-[#1C1C1C80]">
            {interview.durationMinutes
              ? `${interview.durationMinutes} min session`
              : '30 min session'}
          </div>
          <Button
            onClick={() => handleJoin(interview.roomSlug)}
            disabled={!joinable || isPast}
            className="w-full sm:w-auto"
          >
            {isPast
              ? 'Interview Completed'
              : joinable
                ? actionLabel
                : 'Available closer to start time'}
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading || pendingLoading || isLoadingPast) {
    return <PageLoader message="Loading interviews..." />;
  }

  const errorMessage =
    (error as ApiError)?.response?.data?.message ||
    (error as Error)?.message ||
    null;

  return (
    <div className="py-5 px-5 min-h-screen flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Interviews" />
      </div>

      {errorMessage && (
        <div className="rounded-[12px] bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-8">
        {/* Calendly Scheduling Section - Graduates Only */}
        {isGraduate && calendlyApplications.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-700 text-lg font-bold">📅</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#1C1C1C]">
                    Schedule Interview
                  </h2>
                  <p className="text-sm text-[#1C1C1C80]">
                    Companies have Calendly connected - schedule your interview
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              {calendlyApplications.map((app: ApiApplication) => {
                const companyName =
                  app.jobId?.companyId?.companyName || 'Company';
                const jobTitle = app.jobId?.title || 'Position';
                const candidateName =
                  `${app.graduateId?.firstName || ''} ${app.graduateId?.lastName || ''}`.trim() ||
                  'Candidate';

                if (!app._id) return null;

                return (
                  <div
                    key={app._id}
                    className="border border-fade rounded-2xl p-4 bg-white shadow-sm"
                  >
                    <div className="flex flex-col gap-3 mb-4">
                      <p className="text-sm text-[#1C1C1C80]">{companyName}</p>
                      <p className="text-lg font-semibold text-[#1C1C1C]">
                        {jobTitle}
                      </p>
                    </div>
                    <CalendlyScheduler
                      applicationId={app._id}
                      candidateName={candidateName}
                      onSuccess={() => {
                        queryClient.invalidateQueries({
                          queryKey: ['interviews'],
                        });
                        queryClient.invalidateQueries({
                          queryKey: ['graduateApplications'],
                        });
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending Selection Section - Graduates Only */}
        {isGraduate && pendingInterviews.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <span className="text-yellow-700 text-lg font-bold">!</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#1C1C1C]">
                    Action Required
                  </h2>
                  <p className="text-sm text-[#1C1C1C80]">
                    Select your preferred time slot for these interviews
                  </p>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-800 text-sm font-semibold shadow-sm">
                {pendingInterviews.length}{' '}
                {pendingInterviews.length === 1 ? 'pending' : 'pending'}
              </span>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              {pendingInterviews.map((interview) => (
                <InterviewTimeSlotSelector
                  key={interview.id}
                  interview={interview}
                  onSelectSlot={handleSelectSlot}
                  isSelecting={selectingInterviewId === interview.id}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold text-[#1C1C1C]">Upcoming</p>
          {upcoming.length > 0 ? (
            <div className="flex flex-col gap-4">
              {upcoming.map((interview) =>
                renderInterviewCard(interview, false)
              )}
            </div>
          ) : (
            <EmptyState
              title="No upcoming interviews"
              description="Scheduled interviews will appear here once you confirm a time."
            />
          )}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold text-[#1C1C1C]">Past</p>
          {past.length > 0 ? (
            <>
              <div className="flex flex-col gap-4">
                {past.map((interview) => renderInterviewCard(interview, true))}
              </div>
              {/* Infinite scroll trigger */}
              <div
                ref={observerTarget}
                className="h-4 flex items-center justify-center"
              >
                {isFetchingNextPage && (
                  <div className="text-sm text-[#1C1C1C80]">
                    Loading more...
                  </div>
                )}
              </div>
              {!hasNextPage && past.length > 0 && (
                <div className="text-sm text-[#1C1C1C80] text-center py-2">
                  No more past interviews
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="No interviews yet"
              description="Completed interviews will be listed here for your records."
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Interviews;
