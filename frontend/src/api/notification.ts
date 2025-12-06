import api from './client';

export const notificationApi = {
  // Get all notifications
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  // Get unread notification count
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  // Mark notification as read
  markAsRead: async (notificationId: string) => {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },
};

export default notificationApi;
