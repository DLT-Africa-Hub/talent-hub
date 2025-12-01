import api from './client';

export const messageApi = {
  // Get unread message count
  getUnreadCount: async () => {
    try {
      const response = await api.get('/messages/unread-count');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { totalUnread: 0, unreadBySender: [] };
      }
      throw error;
    }
  },

  // Get all conversations with user details
  getMessages: async (params?: { page?: number; limit?: number }) => {
    try {
      const response = await api.get('/messages/conversations', { params });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { messages: [] };
      }
      throw error;
    }
  },

  // Get conversation with a specific user
  getConversation: async (otherUserId: string) => {
    try {
      const response = await api.get(`/messages/conversations/${otherUserId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },

  // Send a message
  sendMessage: async (data: {
    receiverId: string;
    message: string;
    type?: string;
    fileUrl?: string;
    fileName?: string;
    applicationId?: string;
    offerId?: string;
  }) => {
    const response = await api.post('/messages', data);
    return response.data;
  },

  // Mark messages as read
  markAsRead: async (otherUserId: string) => {
    const response = await api.put(`/messages/conversations/${otherUserId}/read`);
    return response.data;
  },
};

export default messageApi;