import { CandidateProfile } from '../types/candidates';
import { ApiApplication, ApiMatch } from '../types/api';
import {
  mapApplicationStatusToCandidateStatus,
  formatExperience,
  formatLocation,
  getCandidateRank,
  DEFAULT_PROFILE_IMAGE,
} from './job.utils';

/**
 * Transform API application to CandidateProfile
 * @param app - The API application object
 * @param index - Optional index for fallback ID
 * @returns CandidateProfile object
 */
export const transformApplication = (
  app: ApiApplication,
  index: number = 0
): CandidateProfile => {
  const graduate = app.graduateId || {};
  const job = app.jobId || {};

  const candidateStatus = mapApplicationStatusToCandidateStatus(
    app.status || ''
  );

  const fullName = `${graduate.firstName || ''} ${
    graduate.lastName || ''
  }`.trim();

  // Check if there's an active interview (scheduled, in_progress, or pending_selection)
  const interview = app.interviewId as
    | {
        _id?: string;
        status?:
          | 'pending_selection'
          | 'scheduled'
          | 'in_progress'
          | 'completed'
          | 'cancelled';
        scheduledAt?: string | Date;
        selectedTimeSlot?: {
          date: string | Date;
          timezone: string;
        };
        suggestedTimeSlots?: Array<{
          date: string | Date;
          duration: number;
          timezone: string;
        }>;
        durationMinutes?: number;
      }
    | undefined;

  const interviewStatus = interview?.status;

  // Determine if there's an active interview
  // Active means: pending_selection, scheduled, or in_progress (not completed or cancelled)
  const hasActiveInterview = interviewStatus
    ? ['pending_selection', 'scheduled', 'in_progress'].includes(
        interviewStatus
      )
    : false;

  // Get interview scheduled date from interview object or application field
  let interviewScheduledAt: string | undefined = undefined;
  if (interview) {
    if (interview.selectedTimeSlot?.date) {
      interviewScheduledAt =
        typeof interview.selectedTimeSlot.date === 'string'
          ? interview.selectedTimeSlot.date
          : interview.selectedTimeSlot.date.toISOString();
    } else if (interview.scheduledAt) {
      interviewScheduledAt =
        typeof interview.scheduledAt === 'string'
          ? interview.scheduledAt
          : interview.scheduledAt.toISOString();
    }
  }
  if (!interviewScheduledAt && app.interviewScheduledAt) {
    interviewScheduledAt =
      typeof app.interviewScheduledAt === 'string'
        ? app.interviewScheduledAt
        : app.interviewScheduledAt.toISOString();
  }

  return {
    id: app._id || index,
    applicationId: app._id?.toString(),
    jobId: job._id?.toString() || job.id?.toString(),
    jobTitle: job.title,
    name: fullName || 'Unknown Candidate',
    role: job.title || graduate.position || 'Developer',
    status: candidateStatus,
    rank: getCandidateRank(graduate.rank),
    statusLabel:
      candidateStatus.charAt(0).toUpperCase() + candidateStatus.slice(1),
    experience: formatExperience(graduate.expYears || 0),
    location: formatLocation(job.location || graduate.location),
    skills: (graduate.skills || []).slice(0, 3),
    image: graduate.profilePictureUrl || DEFAULT_PROFILE_IMAGE,
    summary: graduate.summary,
    cv: typeof app.resume === 'string' ? app.resume : app.resume?.fileUrl,
    matchPercentage: app.matchId?.score
      ? app.matchId.score > 1
        ? Math.min(100, Math.round(app.matchId.score))
        : Math.min(100, Math.round(app.matchId.score * 100))
      : undefined,
    jobType: job.jobType,
    salary: job.salary,
    salaryPerAnnum: graduate.salaryPerAnnum,
    directContact: job.directContact !== false, // Default to true
    interviewScheduledAt,
    interviewRoomSlug: app.interviewRoomSlug,
    interviewStatus: interviewStatus,
    hasUpcomingInterview: hasActiveInterview,
  };
};

/**
 * Transform API match to CandidateProfile
 * @param match - The API match object
 * @param index - Optional index for fallback ID
 * @param options - Optional configuration
 * @returns CandidateProfile object
 */
export const transformMatch = (
  match: ApiMatch,
  index: number = 0,
  options?: {
    includeCompanyName?: boolean;
    includeApplicationId?: boolean;
  }
): CandidateProfile => {
  const graduate = match.graduateId || {};
  const job = match.jobId || {};

  const fullName = `${graduate.firstName || ''} ${
    graduate.lastName || ''
  }`.trim();

  const matchScore = match.score
    ? match.score > 1
      ? Math.min(100, Math.round(match.score))
      : Math.min(100, Math.round(match.score * 100))
    : 0;

  const companyName =
    options?.includeCompanyName &&
    job.companyId &&
    typeof job.companyId === 'object' &&
    'companyName' in job.companyId
      ? (job.companyId as { companyName?: string }).companyName
      : undefined;

  return {
    id: match._id || `match-${index}`,
    applicationId: undefined,
    jobId: job._id?.toString?.() || job.id?.toString() || job.id,
    jobTitle: job.title,
    ...(companyName && { companyName }),
    name: fullName || 'Unknown Candidate',
    role: job.title || graduate.position || 'Developer',
    status: 'matched',
    rank: getCandidateRank(graduate.rank),
    statusLabel: 'Matched',
    experience: formatExperience(graduate.expYears || 0),
    location: formatLocation(job.location || graduate.location),
    skills: (graduate.skills || []).slice(0, 3),
    image: graduate.profilePictureUrl || DEFAULT_PROFILE_IMAGE,
    summary: graduate.summary,
    cv: (() => {
      // Handle different CV formats from different API endpoints
      if (!graduate.cv) return undefined;

      // If it's a string, return it directly
      if (typeof graduate.cv === 'string') return graduate.cv;

      // If it's an array (from getAllMatches), find the display CV or first CV
      if (Array.isArray(graduate.cv)) {
        const displayCV =
          graduate.cv.find((cv: { onDisplay?: boolean }) => cv.onDisplay) ||
          graduate.cv[0];
        return displayCV?.fileUrl;
      }

      // If it's an object with fileUrl (from getAvailableGraduates)
      if (typeof graduate.cv === 'object' && 'fileUrl' in graduate.cv) {
        return (graduate.cv as { fileUrl?: string }).fileUrl;
      }

      return undefined;
    })(),
    matchPercentage: matchScore,
    jobType: job.jobType,
    salary: job.salary,
    salaryPerAnnum: graduate.salaryPerAnnum,
    directContact: job.directContact !== false, // Default to true
  };
};
