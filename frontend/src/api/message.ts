import api from './client';

export const messageApi = {
  // Get unread message count
  getUnreadCount: async () => {
    try {
      const response = await api.get('/messages/unread-count');
      return response.data;
    } catch (error: any) {
      // If endpoint doesn't exist yet, return 0
      if (error.response?.status === 404) {
        return { count: 0 };
      }
      throw error;
    }
  },

  // Get all messages/conversations
  getMessages: async (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    try {
      const response = await api.get('/messages', { params });
      return response.data;
    } catch (error: any) {
      // If endpoint doesn't exist yet, return empty array
      if (error.response?.status === 404) {
        return { messages: [], pagination: { total: 0 } };
      }
      throw error;
    }
  },
};

export default messageApi;

