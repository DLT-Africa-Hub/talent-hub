export type JobStatus = 'active' | 'paused' | 'closed';

export interface CompanyJob {
  id: number;
  title: string;
  location: string;
  description: string;
  duration: string;
  salaryRange: string;
  salaryType: string;
  matchedCount: number;
  status: JobStatus;
  image: string;
}
