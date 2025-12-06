export type CandidateStatus = 'applied' | 'matched' | 'hired' | 'pending';

export interface CandidateProfile {
  id: number | string;
  applicationId?: string;
  jobId?: string;
  jobTitle?: string;
  companyName?: string;
  name: string;
  role: string;
  status: CandidateStatus;
  rank: 'A' | 'B' | 'C' | 'D';
  statusLabel: string;
  experience: string;
  location: string;
  skills: string[];
  image: string;
  summary?: string;
  cv?: string;
  matchPercentage?: number;
  jobType?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  salaryPerAnnum?: number;
  directContact?: boolean;
  interviewScheduledAt?: string;
  interviewRoomSlug?: string;
  interviewStatus?: string;
  hasUpcomingInterview?: boolean;
}
