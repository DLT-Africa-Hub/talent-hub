import { useQuery } from '@tanstack/react-query';
import { companyApi } from '../api/company';
import { ApiApplication, ApiMatch } from '../types/api';

interface UseCompanyApplicationsOptions {
  page?: number;
  limit?: number;
  status?: string;
  jobId?: string;
  search?: string;
  refetchInterval?: number;
  enabled?: boolean;
}

interface UseCompanyMatchesOptions {
  page?: number;
  limit?: number;
  search?: string;
  refetchInterval?: number;
  enabled?: boolean;
}

/**
 * Hook to fetch company applications
 */
export const useCompanyApplications = (
  options: UseCompanyApplicationsOptions = {}
) => {
  const {
    page = 1,
    limit = 100,
    status,
    jobId,
    search,
    refetchInterval,
    enabled = true,
  } = options;

  return useQuery({
    queryKey: ['companyApplications', { page, limit, status, jobId, search }],
    queryFn: async () => {
      const response = await companyApi.getApplications({
        page,
        limit,
        ...(status && { status }),
        ...(jobId && { jobId }),
        ...(search && search.trim() && { search: search.trim() }),
      });
      return response;
    },
    enabled,
    ...(refetchInterval && { refetchInterval }),
  });
};

/**
 * Hook to fetch company matches
 */
export const useCompanyMatches = (options: UseCompanyMatchesOptions = {}) => {
  const {
    page = 1,
    limit = 100,
    search,
    refetchInterval,
    enabled = true,
  } = options;

  return useQuery({
    queryKey: ['companyMatches', { page, limit, search }],
    queryFn: async () => {
      const response = await companyApi.getAllMatches({
        page,
        limit,
        ...(search && search.trim() && { search: search.trim() }),
      });
      return response;
    },
    enabled,
    ...(refetchInterval && { refetchInterval }),
  });
};

/**
 * Extract applications array from API response
 */
export const extractApplications = (response: unknown): ApiApplication[] => {
  if (!response) return [];
  if (Array.isArray(response)) {
    return response;
  }
  if (
    response !== null &&
    typeof response === 'object' &&
    'applications' in response &&
    Array.isArray((response as { applications: unknown }).applications)
  ) {
    return (response as { applications: ApiApplication[] }).applications;
  }
  return [];
};

/**
 * Extract matches array from API response
 */
export const extractMatches = (response: unknown): ApiMatch[] => {
  if (!response) return [];
  if (Array.isArray(response)) {
    return response;
  }
  if (
    response !== null &&
    typeof response === 'object' &&
    'matches' in response &&
    Array.isArray((response as { matches: unknown }).matches)
  ) {
    return (response as { matches: ApiMatch[] }).matches;
  }
  return [];
};
