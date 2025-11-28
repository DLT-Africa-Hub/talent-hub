import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { companyApi } from '../api/company';
import { graduateApi } from '../api/graduate';
import { Button, EmptyState, PageLoader, SectionHeader } from '../components/ui';

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
  });
};

const Interviews = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;
  const isCompany = role === 'company';

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['interviews', role],
    queryFn: async () => {
      if (isCompany) {
        return companyApi.getInterviews({ page: 1, limit: 100 });
      }
      return graduateApi.getInterviews({ page: 1, limit: 100 });
    },
  });

  const interviews: InterviewRecord[] = data?.interviews ?? [];

  const { upcoming, past } = useMemo(() => {
    if (!interviews.length) {
      return { upcoming: [], past: [] };
    }
    const now = Date.now();
    const future: InterviewRecord[] = [];
    const completed: InterviewRecord[] = [];

    interviews.forEach((interview) => {
      const scheduledTime = interview.scheduledAt
        ? new Date(interview.scheduledAt).getTime()
        : 0;
      if (scheduledTime >= now - JOIN_GRACE_MINUTES * 60 * 1000) {
        future.push(interview);
      } else {
        completed.push(interview);
      }
    });

    return {
      upcoming: future.sort(
        (a, b) =>
          new Date(a.scheduledAt || 0).getTime() -
          new Date(b.scheduledAt || 0).getTime()
      ),
      past: completed.sort(
        (a, b) =>
          new Date(b.scheduledAt || 0).getTime() -
          new Date(a.scheduledAt || 0).getTime()
      ),
    };
  }, [interviews]);

  const canJoinInterview = (scheduledAt?: string) => {
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

  const renderInterviewCard = (interview: InterviewRecord) => {
    const joinable = canJoinInterview(interview.scheduledAt);
    const counterpartName = isCompany
      ? interview.participant?.name || 'Candidate'
      : interview.job?.companyName || 'Company';
    const actionLabel = isCompany ? 'Start Interview' : 'Join Interview';

    return (
      <div
        key={interview.id}
        className="flex flex-col gap-4 border border-fade rounded-2xl p-4 bg-white shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <p className="text-sm text-[#1C1C1C80]">
            {isCompany ? 'Candidate' : 'Company'}
          </p>
          <p className="text-lg font-semibold text-[#1C1C1C]">
            {counterpartName}
          </p>
          {interview.job?.title && (
            <p className="text-sm text-[#1C1C1C80]">
              {interview.job?.title}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-[#1C1C1C80]">
          <span className="px-3 py-1 rounded-full bg-[#F8F8F8] border border-fade">
            {formatDateTime(interview.scheduledAt)}
          </span>
          {interview.status && (
            <span className="px-3 py-1 rounded-full bg-[#E8F1FF] text-[#1B5F77] border border-[#1B5F7722]">
              {interview.status.replace('_', ' ')}
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
            disabled={!joinable}
            className="w-full sm:w-auto"
          >
            {joinable ? actionLabel : 'Available closer to start time'}
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <PageLoader message="Loading interviews..." />;
  }

  const errorMessage =
    (error as any)?.response?.data?.message ||
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

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold text-[#1C1C1C]">
            Upcoming
          </p>
          {upcoming.length > 0 ? (
            <div className="flex flex-col gap-4">
              {upcoming.map(renderInterviewCard)}
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
            <div className="flex flex-col gap-4">
              {past.map(renderInterviewCard)}
            </div>
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

