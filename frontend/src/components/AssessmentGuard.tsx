import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { graduateApi } from '../api/graduate';
import { ReactNode } from 'react';

interface AssessmentGuardProps {
  children: ReactNode;
}

const AssessmentGuard: React.FC<AssessmentGuardProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

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

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser?.role !== 'graduate') {
    return <>{children}</>;
  }

  if (isLoading) {
    return null;
  }

  if (error) {
    const is404 = (error as any)?.response?.status === 404;
    if (is404) {
      return <>{children}</>;
    }
    return <Navigate to="/assessment" replace />;
  }

  if (profileData && !hasCompletedAssessment) {
    return <Navigate to="/assessment" replace />;
  }

  return <>{children}</>;
};

export default AssessmentGuard;
