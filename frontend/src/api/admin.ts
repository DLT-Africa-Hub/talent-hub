import api from './client';

export const adminApi = {
  // User Management
  getAllUsers: async (params?: {
    page?: number;
    limit?: number;
    role?: string;
  }) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  searchUsers: async (
    query: string,
    params?: { page?: number; limit?: number }
  ) => {
    const response = await api.get('/admin/users/search', {
      params: { q: query, ...params },
    });
    return response.data;
  },

  getUserById: async (userId: string) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId: string, userData: Record<string, unknown>) => {
    const response = await api.put(`/admin/users/${userId}`, userData);
    return response.data;
  },

  deleteUser: async (userId: string) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  // Job Management
  getAllJobs: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => {
    const response = await api.get('/admin/jobs', { params });
    return response.data;
  },

  // Match Management
  getAllMatches: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => {
    const response = await api.get('/admin/matches', { params });
    return response.data;
  },

  // Statistics
  getAIStats: async () => {
    const response = await api.get('/admin/ai-stats');
    return response.data;
  },

  getSystemStats: async () => {
    const response = await api.get('/admin/system-stats');
    return response.data;
  },

  getDatabaseStats: async () => {
    const response = await api.get('/admin/db-stats');
    return response.data;
  },

  // Activity Logs
  getUserActivityLogs: async (params?: {
    page?: number;
    limit?: number;
    userId?: string;
  }) => {
    const response = await api.get('/admin/user-activity', { params });
    return response.data;
  },

  // Health Status
  getHealthStatus: async () => {
    const response = await api.get('/admin/health');
    return response.data;
  },
};

export default adminApi;
