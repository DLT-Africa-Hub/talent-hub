import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { graduateApi } from '../api/graduate';
import { ReactNode } from 'react';
import { PageLoader } from './ui';
import { ApiError } from '../types/api';

interface GraduateProfileResponse {
  graduate?: {
    assessmentData?: {
      submittedAt?: string | Date;
      lastScore?: number;
      needsRetake?: boolean;
    };
  };
}

interface AssessmentGuardProps {
  children: ReactNode;
}

const AssessmentGuard: React.FC<AssessmentGuardProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const isOnAssessmentRoute = location.pathname === '/assessment';

  const token =
    typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  const storedUser =
    typeof window !== 'undefined' ? sessionStorage.getItem('user') : null;
  const isAuth = isAuthenticated || (token && storedUser);
  const currentUser = user || (storedUser ? JSON.parse(storedUser) : null);

  const shouldFetch = Boolean(isAuth && currentUser?.role === 'graduate');
  const {
    data: profileData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['graduateProfile', 'assessment'],
    queryFn: async () => {
      const response = await graduateApi.getProfile();
      return response;
    },
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const hasCompletedAssessment = useMemo(() => {
    if (!profileData) return false;
    const assessmentData = (profileData as GraduateProfileResponse)?.graduate
      ?.assessmentData;
    return assessmentData?.submittedAt != null;
  }, [profileData]);

  const hasPassedAssessment = useMemo(() => {
    if (!profileData) return false;
    const assessmentData = (profileData as GraduateProfileResponse)?.graduate
      ?.assessmentData;
    if (!assessmentData) return false;

    const lastScore = assessmentData.lastScore;
    const needsRetake = assessmentData.needsRetake;

    return lastScore !== undefined && lastScore >= 60 && needsRetake === false;
  }, [profileData]);

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser?.role !== 'graduate') {
    return <>{children}</>;
  }

  if (isLoading) {
    return <PageLoader message="Loading..." />;
  }

  // If on assessment route and user has passed, redirect to dashboard
  if (isOnAssessmentRoute && hasPassedAssessment) {
    return <Navigate to="/graduate" replace />;
  }

  // If on assessment route, allow access (user hasn't passed or hasn't taken it)
  if (isOnAssessmentRoute) {
    return <>{children}</>;
  }

  // Handle errors
  if (error) {
    const apiError = error as ApiError;
    const status = apiError?.response?.status;

    // 401 Unauthorized - redirect to login
    if (status === 401) {
      return <Navigate to="/login" replace />;
    }

    // 404 Not Found - profile doesn't exist yet, allow access (will be handled by onboarding)
    if (status === 404) {
      return <>{children}</>;
    }

    // For other errors, if we have profileData, use it; otherwise allow access
    // This prevents redirect loops when there are temporary network issues
    if (profileData) {
      // We have data, check assessment status
      if (!hasCompletedAssessment) {
        return <Navigate to="/assessment" replace />;
      }
      return <>{children}</>;
    }

    // No profileData and error - allow access to prevent blocking users
    // The error might be temporary (network, server issue, etc.)
    return <>{children}</>;
  }

  // For other routes: if assessment not completed, redirect to assessment
  if (profileData && !hasCompletedAssessment) {
    return <Navigate to="/assessment" replace />;
  }

  return <>{children}</>;
};

export default AssessmentGuard;
