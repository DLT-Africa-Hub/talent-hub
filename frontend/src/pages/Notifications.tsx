import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { notificationApi } from '../api/notification';
import {
  DEFAULT_COMPANY_IMAGE,
  formatNotificationDate,
  getCompanyName,
  mapNotificationType,
} from '../utils/job.utils';
import { LoadingSpinner } from '../index';
import { SearchBar, EmptyState } from '../components/ui';
import NotificationDetailsModal from '../components/notifications/NotificationDetailsModal';
import { NotificationItem } from '../types/notification';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const {
    data: notificationsData,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await notificationApi.getNotifications({
        page: 1,
        limit: 100,
      });
      return response.notifications || [];
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await notificationApi.markAsRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = useMemo(() => {
    if (!notificationsData) return [];

    return notificationsData.map((notif: any): NotificationItem => {
      const createdAt =
        typeof notif.createdAt === 'string'
          ? new Date(notif.createdAt)
          : new Date();
      const displayDate = formatNotificationDate(createdAt);
      const companyName = getCompanyName(notif, user?.role);

      return {
        id: notif.id,
        type: mapNotificationType(notif.type, notif.relatedType),
        title: notif.title,
        description: notif.message,
        company: {
          name: companyName,
          image: DEFAULT_COMPANY_IMAGE,
        },
        createdAt,
        displayDate,
        read: notif.read || false,
        relatedId: notif.relatedId,
        relatedType: notif.relatedType,
      };
    });
  }, [notificationsData, user?.role]);

  const filtered = useMemo(() => {
    if (!query.trim()) return notifications;
    const q = query.toLowerCase();
    return notifications.filter(
      (n: NotificationItem) =>
        n.title.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.company.name.toLowerCase().includes(q)
    );
  }, [notifications, query]);

  const groupedNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayList: NotificationItem[] = [];
    const yesterdayList: NotificationItem[] = [];
    const olderList: NotificationItem[] = [];

    filtered.forEach((notif: NotificationItem) => {
      const notifDate = new Date(notif.createdAt);
      notifDate.setHours(0, 0, 0, 0);

      if (notifDate.getTime() === today.getTime()) {
        todayList.push(notif);
      } else if (notifDate.getTime() === yesterday.getTime()) {
        yesterdayList.push(notif);
      } else {
        olderList.push(notif);
      }
    });

    return { today: todayList, yesterday: yesterdayList, older: olderList };
  }, [filtered]);

  const handleNotificationAction = useCallback(
    (notification: NotificationItem) => {
      if (user?.role === 'graduate') {
        if (notification.relatedType === 'job' && notification.relatedId) {
          navigate(`/explore?preview=${notification.relatedId}`);
        } else if (notification.relatedType === 'match' && notification.relatedId) {
          // For match notifications, navigate to explore with the match ID
          navigate(`/explore?match=${notification.relatedId}`);
        } else if (notification.type === 'message' && notification.relatedId) {
          navigate(`/messages/${notification.relatedId}`);
        } else if (
          notification.relatedType === 'application' &&
          notification.relatedId
        ) {
          navigate(`/applications`);
        } else if (notification.type === 'match' && notification.relatedId) {
          // Fallback for match type
          navigate(`/explore?match=${notification.relatedId}`);
        } else if (notification.type === 'application' && notification.relatedId) {
          navigate(`/applications`);
        }
      } else if (user?.role === 'company') {
        if (notification.relatedType === 'application' && notification.relatedId) {
          navigate(`/candidate-preview/${notification.relatedId}`);
        } else if (notification.type === 'application' && notification.relatedId) {
          navigate(`/candidate-preview/${notification.relatedId}`);
        } else if (notification.relatedType === 'match' && notification.relatedId) {
          navigate(`/candidates`);
        } else if (notification.type === 'match' && notification.relatedId) {
          navigate(`/candidates`);
        } else if (notification.type === 'message' && notification.relatedId) {
          navigate(`/messages/${notification.relatedId}`);
        } else if (notification.relatedType === 'job' && notification.relatedId) {
          navigate(`/jobs`);
        } else if (notification.type === 'job_alert' && notification.relatedId) {
          navigate(`/jobs`);
        } else if (notification.type === 'system' && notification.relatedType === 'job' && notification.relatedId) {
          navigate(`/jobs`);
        }
      }
      setIsDetailsOpen(false);
      setSelectedNotification(null);
    },
    [navigate, user?.role]
  );

  const handleNotificationClick = useCallback(
    (notification: NotificationItem) => {
      if (!notification.read) {
        markAsReadMutation.mutate(notification.id);
      }
      setSelectedNotification(notification);
      setIsDetailsOpen(true);
    },
    [markAsReadMutation]
  );

  const renderNotification = useCallback(
    (n: NotificationItem) => {
      return (
        <button
          key={n.id}
          onClick={() => handleNotificationClick(n)}
          className="w-full text-left py-4 px-2 flex items-center border-b border-fade justify-between gap-4 hover:bg-[#00000008] cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[10px] overflow-hidden shrink-0">
              <img
                src={n.company.image}
                alt={n.company.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <p className="text-[#1C1C1C] font-medium">{n.title}</p>
                {!n.read && (
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                )}
              </div>
              <p className="text-[#1C1C1C80] text-sm truncate max-w-[300px]">
                {n.description}
              </p>
            </div>
          </div>
          <p className="text-[#1C1C1C80] text-[12px]">
            {n.read ? 'Read' : 'New'}
          </p>
        </button>
      );
    },
    [handleNotificationClick]
  );

  const error = useMemo(() => {
    if (!queryError) return null;
    const err = queryError as any;
    return (
      err.response?.data?.message ||
      'Failed to load notifications. Please try again.'
    );
  }, [queryError]);

  return (
    <div className="py-5 px-5 min-h-screen flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <p className="font-medium text-[22px] text-[#1C1C1C]">Notifications</p>
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search notifications"
          maxWidth="max-w-[500px]"
        />
      </div>

      {error && (
        <div className="rounded-[12px] bg-red-50 border border-red-200 p-[16px]">
          <p className="text-[14px] text-red-600">{error}</p>
        </div>
      )}

      {loading && (
        <LoadingSpinner message="Loading notifications..." fullPage />
      )}

      {!loading && (
        <>
          {groupedNotifications.today.length > 0 && (
            <div>
              <p className="font-semibold text-[#1C1C1C] mb-2">Today</p>
              <div className="flex flex-col divide-y">
                {groupedNotifications.today.map(renderNotification)}
              </div>
            </div>
          )}

          {groupedNotifications.yesterday.length > 0 && (
            <div>
              <p className="font-semibold text-[#1C1C1C] mb-2">Yesterday</p>
              <div className="flex flex-col divide-y">
                {groupedNotifications.yesterday.map(renderNotification)}
              </div>
            </div>
          )}

          {groupedNotifications.older.length > 0 && (
            <div>
              <p className="font-semibold text-[#1C1C1C] mb-2">Older</p>
              <div className="flex flex-col divide-y">
                {groupedNotifications.older.map(renderNotification)}
              </div>
            </div>
          )}

          {filtered.length === 0 && !loading && (
            <EmptyState
              title={query ? 'No notifications found' : 'No notifications yet'}
              description={
                query
                  ? 'Try adjusting your search to find notifications.'
                  : 'You will receive notifications about matches, applications, and messages here.'
              }
              variant="minimal"
            />
          )}
        </>
      )}
      <NotificationDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedNotification(null);
        }}
        notification={selectedNotification}
        onViewAction={handleNotificationAction}
      />
    </div>
  );
};

export default Notifications;
