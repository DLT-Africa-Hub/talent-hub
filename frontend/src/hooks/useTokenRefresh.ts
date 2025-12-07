import { useEffect, useRef } from 'react';
import { getTimeUntilExpiration } from '../utils/token.utils';
import { authApi } from '../api/auth';

/**
 * Hook to periodically check and refresh tokens before they expire
 * This ensures users stay logged in even when idle
 */
export const useTokenRefresh = () => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    const checkAndRefreshToken = async () => {
      // Skip if already refreshing
      if (isRefreshingRef.current) {
        return;
      }

      const token = sessionStorage.getItem('token');
      const refreshToken = sessionStorage.getItem('refreshToken');

      if (!token || !refreshToken) {
        return;
      }

      // Get time until expiration (in milliseconds)
      const timeUntilExpiration = getTimeUntilExpiration(token);

      // Refresh if token expires in less than 10 minutes (600000 ms)
      const refreshThreshold = 10 * 60 * 1000; // 10 minutes

      if (timeUntilExpiration > 0 && timeUntilExpiration < refreshThreshold) {
        try {
          isRefreshingRef.current = true;
          const response = await authApi.refreshToken(refreshToken);
          const { accessToken, refreshToken: newRefreshToken } = response;

          if (accessToken) {
            sessionStorage.setItem('token', accessToken);
            if (newRefreshToken) {
              sessionStorage.setItem('refreshToken', newRefreshToken);
            }
            console.log('Token refreshed proactively');
          }
        } catch (error) {
          console.error('Failed to refresh token proactively:', error);
          // Don't clear tokens here - let the 401 handler deal with it
        } finally {
          isRefreshingRef.current = false;
        }
      }
    };

    // Check immediately
    checkAndRefreshToken();

    // Check every 5 minutes
    intervalRef.current = setInterval(checkAndRefreshToken, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
};
