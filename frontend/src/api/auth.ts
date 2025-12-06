import api from './client';

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (email: string, password: string, role: string) => {
    const response = await api.post('/auth/register', {
      email,
      password,
      role,
    });
    return response.data;
  },

  requestPasswordReset: async (email: string) => {
    const response = await api.post('/auth/request-password-reset', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string) => {
    const response = await api.post('/auth/reset-password', {
      token,
      password,
    });
    return response.data;
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    const response = await api.post('/auth/change-password', {
      oldPassword,
      newPassword,
    });
    return response.data;
  },

  requestEmailVerification: async () => {
    const response = await api.post('/auth/request-email-verification', {});
    return response.data;
  },

  verifyEmail: async (token: string) => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },
};

export default api;
