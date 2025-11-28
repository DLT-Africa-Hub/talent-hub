import api from './client';

export const interviewApi = {
  getInterviewBySlug: async (slug: string) => {
    const response = await api.get(`/interviews/${slug}`);
    return response.data;
  },
};

export default interviewApi;

