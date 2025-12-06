import { JobStatus } from '../data/jobs';
import { CandidateStatus } from '../types/candidates';
import { PiPlugsConnectedDuotone } from 'react-icons/pi';
import { MdCheckCircleOutline } from 'react-icons/md';
import { FaRegHand } from 'react-icons/fa6';
import { IconType } from 'react-icons';

// Default job image
export const DEFAULT_JOB_IMAGE =
  'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80';

// Map API job status to CompanyJob status
export const mapJobStatus = (apiStatus: string): JobStatus => {
  if (apiStatus === 'active') return 'active';
  if (apiStatus === 'closed') return 'closed';
  return 'paused'; // Map 'draft' to 'paused' for display
};

// Job status styles
export const jobStatusStyles: Record<JobStatus, string> = {
  active: 'bg-[#EAF4E2] text-[#1B7700]',
  paused: 'bg-[#FFF5E0] text-[#8A6A05]',
  closed: 'bg-[#F5E6FF] text-[#5D1B77]',
};

// Job status labels
export const jobStatusLabels: Record<JobStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  closed: 'Closed',
};

// Common currencies with symbols
export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr' },
  { code: 'RWF', symbol: 'RF', name: 'Rwandan Franc' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
] as const;

// Get currency symbol
export const getCurrencySymbol = (currencyCode?: string): string => {
  if (!currencyCode) return '$';
  const currency = CURRENCIES.find((c) => c.code === currencyCode);
  return currency?.symbol || currencyCode;
};

// Format salary range
export const formatSalaryRange = (salary?: {
  amount?: number;
  currency?: string;
}): string => {
  if (!salary || !salary.amount) return 'Not specified';
  const symbol = getCurrencySymbol(salary.currency);
  // Format as thousands (e.g., 50000 -> 50k)
  const amountInK = Math.round(salary.amount / 1000);
  return `${symbol}${amountInK.toLocaleString()}k`;
};

// Format salary per annum
export const formatSalaryPerAnnum = (
  salaryPerAnnum?: number,
  currency: string = 'USD'
): string => {
  if (!salaryPerAnnum || salaryPerAnnum <= 0) return 'Not specified';
  const symbol = currency === 'USD' ? '$' : currency === 'NGN' ? '₦' : currency;
  // Format with commas (e.g., 50000 -> $50,000)
  return `${symbol}${salaryPerAnnum.toLocaleString()}/year`;
};

// Format job type to duration-like string
export const formatJobType = (jobType: string): string => {
  const typeMap: Record<string, string> = {
    'Full time': 'Full-time',
    'Part time': 'Part-time',
    Contract: 'Contract',
    Internship: 'Internship',
  };
  return typeMap[jobType] || jobType;
};

// Get salary type based on job type
export const getSalaryType = (jobType: string): string => {
  if (jobType === 'Contract' || jobType === 'Internship') {
    return 'Project';
  }
  return 'Annual';
};

// Candidate status styles
export const candidateStatusStyles: Record<CandidateStatus, string> = {
  applied: 'bg-[#E2F4DA] text-[#1B7700]',
  matched: 'bg-[#E9F1FF] text-[#1B5F77]',
  hired: 'bg-[#F9F3D6] text-[#8A6A05]',
  pending: 'bg-[#F5E6FF] text-[#5D1B77]',
};

// Candidate rank badge styles
export const candidateRankBadgeStyles: Record<CandidateStatus, string> = {
  applied: 'bg-[#1B7700]',
  matched: 'bg-[#1B5F77]',
  hired: 'bg-[#8A6A05]',
  pending: 'bg-[#5D1B77]',
};

// Candidate status filters
export const candidateStatusFilters: {
  label: string;
  value: CandidateStatus | 'all';
  icon?: IconType;
}[] = [
  { label: 'Applied', value: 'applied' },
  { label: 'Matched', value: 'matched', icon: PiPlugsConnectedDuotone },
  { label: 'Hired', value: 'hired', icon: MdCheckCircleOutline },
  { label: 'Pending', value: 'pending', icon: FaRegHand },
];

// Map API application status to candidate status
export const mapApplicationStatusToCandidateStatus = (
  appStatus: string
): CandidateStatus => {
  // Hired status - only when explicitly hired
  if (appStatus === 'hired') return 'hired';

  // Pending status - when offer is sent but not yet accepted
  if (appStatus === 'offer_sent') return 'pending';

  // Matched status - only when explicitly reviewed/shortlisted/interviewed
  // Having a match alone doesn't make it 'matched' - they need to be reviewed first
  if (['reviewed', 'shortlisted', 'interviewed'].includes(appStatus)) {
    return 'matched';
  }

  // Applied status - when status is 'pending' or 'accepted' (default when someone applies)
  // Note: 'accepted' application status should not exist - when accepting, status becomes 'offer_sent'
  // But we handle it gracefully here just in case
  if (appStatus === 'pending' || appStatus === 'accepted' || !appStatus) {
    return 'applied';
  }

  // Rejected or withdrawn - still show as 'applied' for now (could add 'rejected' status later)
  if (appStatus === 'rejected' || appStatus === 'withdrawn') {
    return 'applied';
  }

  return 'applied'; // Default fallback
};

// Format experience years
export const formatExperience = (years: number): string => {
  if (years >= 5) return `${years}+ yrs`;
  return `${years} yrs`;
};

// Format location
export const formatLocation = (
  jobLocation?: string,
  workType?: string
): string => {
  if (!jobLocation) return 'Location not specified';
  const locationParts = jobLocation.split(',').map((s) => s.trim());
  const workTypeStr = workType ? `${workType} • ` : '';
  return `${workTypeStr}${locationParts.join(', ')}`;
};

// Get rank from graduate (handle "A and B" format)
export const getCandidateRank = (rank?: string): 'A' | 'B' | 'C' | 'D' => {
  if (!rank) return 'C';
  const firstRank = rank.charAt(0).toUpperCase();
  if (['A', 'B', 'C', 'D'].includes(firstRank)) {
    return firstRank as 'A' | 'B' | 'C' | 'D';
  }
  return 'C';
};

// Default profile image
export const DEFAULT_PROFILE_IMAGE =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80';

// Default company image
export const DEFAULT_COMPANY_IMAGE =
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2069';

// Format notification date
export const formatNotificationDate = (dateInput: string | Date): string => {
  const date =
    typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Get company name from notification (fallback logic)
export const getCompanyName = (
  _notification: unknown,
  userRole?: string
): string => {
  // For graduates: notifications might be about companies
  // For companies: notifications might be about candidates/applications
  if (userRole === 'graduate') {
    return 'Company';
  }
  return 'Talent Match';
};

// Map notification type to navigation type
export const mapNotificationType = (
  type: string,
  relatedType?: string | null
): 'job' | 'message' | 'match' | 'application' | 'interview' => {
  if (type === 'interview' || relatedType === 'interview') return 'interview';
  if (type === 'job_alert' || relatedType === 'job') return 'job';
  if (type === 'message') return 'message';
  if (type === 'match' || relatedType === 'match') return 'match';
  if (type === 'application' || relatedType === 'application')
    return 'application';
  return 'message'; // Default
};
