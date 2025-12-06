import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { notificationApi } from '../api/notification';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../types/api';

/**
 * Hook for real-time notification polling
 * Polls for unread count every 60 seconds when user is authenticated
 * Only polls unread count - full notifications list should be fetched on the Notifications page
 */
export const useNotifications = (options?: {
  enabled?: boolean;
  fetchList?: boolean;
}) => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const enabled = options?.enabled !== false && isAuthenticated;
  const fetchList = options?.fetchList === true;

  // Poll for unread count only (lightweight)
  const { data: unreadCountData, refetch } = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: async () => {
      const response = await notificationApi.getUnreadCount();
      return response.count || 0;
    },
    enabled,
    refetchInterval: 60000, // Poll every 60 seconds (reduced from 30)
    staleTime: 30000, // Consider fresh for 30 seconds
    retry: (failureCount, error: unknown) => {
      const err = error as ApiError;
      // Don't retry on 429 (rate limit) errors
      if (err?.response?.status === 429) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * Math.pow(2, attemptIndex), 4000);
    },
  });

  // Only fetch notifications list if explicitly requested (e.g., on Notifications page)
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await notificationApi.getNotifications({
        page: 1,
        limit: 50,
      });
      return response.notifications || [];
    },
    enabled: enabled && fetchList, // Only fetch when explicitly requested
    refetchInterval: fetchList ? 60000 : false, // Only poll if list is being fetched
    staleTime: 30000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 429) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => {
      return Math.min(1000 * Math.pow(2, attemptIndex), 4000);
    },
  });

  // Refetch when window gains focus (but respect rate limits)
  useEffect(() => {
    if (!enabled) return;

    const handleFocus = () => {
      // Only refetch unread count on focus, not the full list
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'unreadCount'],
      });
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [enabled, queryClient]);

  const unreadCount = unreadCountData ?? 0;
  const notifications = notificationsData ?? [];

  return {
    unreadCount,
    notifications,
    refetch,
  };
};
