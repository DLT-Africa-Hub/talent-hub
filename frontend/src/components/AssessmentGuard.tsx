import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { graduateApi } from '../api/graduate';
import { ReactNode } from 'react';
import { PageLoader } from './ui';

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
    const assessmentData = (profileData as any)?.graduate?.assessmentData;
    return assessmentData?.submittedAt != null;
  }, [profileData]);

  const hasPassedAssessment = useMemo(() => {
    if (!profileData) return false;
    const assessmentData = (profileData as any)?.graduate?.assessmentData;
    if (!assessmentData) return false;

    const lastScore = assessmentData.lastScore;
    const needsRetake = assessmentData.needsRetake;

    // User has passed if they have a score >= 60 and don't need to retake
    return (
      lastScore !== undefined &&
      lastScore >= 60 &&
      needsRetake === false
    );
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

  // For other routes: if error (except 404), redirect to assessment
  if (error) {
    const is404 = (error as any)?.response?.status === 404;
    if (is404) {
      return <>{children}</>;
    }
    return <Navigate to="/assessment" replace />;
  }

  // For other routes: if assessment not completed, redirect to assessment
  if (profileData && !hasCompletedAssessment) {
    return <Navigate to="/assessment" replace />;
  }

  return <>{children}</>;
};

export default AssessmentGuard;
