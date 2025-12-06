import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { companyApi } from '../api/company';
import { ReactNode } from 'react';
import { PageLoader } from './ui';
import { ApiError } from '../types/api';

interface CompanyProfileResponse {
  companyName?: string;
  industry?: string;
  companySize?: string;
  description?: string;
}

interface CompanyRouteGuardProps {
  children: ReactNode;
}

const CompanyRouteGuard: React.FC<CompanyRouteGuardProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const isOnOnboardingRoute = location.pathname === '/company/onboarding';

  const token =
    typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  const storedUser =
    typeof window !== 'undefined' ? sessionStorage.getItem('user') : null;
  const isAuth = isAuthenticated || (token && storedUser);
  const currentUser = user || (storedUser ? JSON.parse(storedUser) : null);

  const shouldFetch = Boolean(isAuth && currentUser?.role === 'company');
  const {
    data: profileData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['companyProfile', 'guard'],
    queryFn: async () => {
      const response = await companyApi.getProfile();
      return response;
    },
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const hasCompletedProfile = useMemo(() => {
    if (!profileData) return false;
    const company = profileData as CompanyProfileResponse;
    // Check if all required fields are present
    return (
      company?.companyName &&
      company?.industry &&
      company?.companySize &&
      company?.description
    );
  }, [profileData]);

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser?.role !== 'company') {
    return <>{children}</>;
  }

  if (isLoading) {
    return <PageLoader message="Loading..." />;
  }

  // If on onboarding route and profile is complete, redirect to dashboard
  if (isOnOnboardingRoute && hasCompletedProfile) {
    return <Navigate to="/company" replace />;
  }

  // If on onboarding route, allow access (user hasn't completed profile)
  if (isOnOnboardingRoute) {
    return <>{children}</>;
  }

  // For other routes: if error (except 404), allow access (might be first time)
  if (error) {
    const is404 = (error as ApiError)?.response?.status === 404;
    if (is404) {
      // Profile doesn't exist, redirect to onboarding
      return <Navigate to="/company/onboarding" replace />;
    }
    // Other errors, allow access (might be network issues)
    return <>{children}</>;
  }

  // For other routes: if profile not completed, redirect to onboarding
  if (profileData && !hasCompletedProfile) {
    return <Navigate to="/company/onboarding" replace />;
  }

  // If no profile data and not loading, redirect to onboarding
  if (!profileData && !isLoading) {
    return <Navigate to="/company/onboarding" replace />;
  }

  return <>{children}</>;
};

export default CompanyRouteGuard;
