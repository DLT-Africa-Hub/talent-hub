import api from './client';

export const interviewApi = {
  getInterviewBySlug: async (slug: string) => {
    const response = await api.get(`/interviews/${slug}`);
    return response.data;
  },
  getStreamToken: async () => {
    const response = await api.get('/interviews/token/stream');
    // Backend returns { success: true, data: { token } }
    return response.data.data?.token || response.data.token;
  },
};

export default interviewApi;
