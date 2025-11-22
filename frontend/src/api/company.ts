import api from './client';

export const companyApi = {
  // Profile Management
  getProfile: async () => {
    const response = await api.get('/companies/profile');
    return response.data;
  },

  createProfile: async (profileData: any) => {
    const response = await api.post('/companies/profile', profileData);
    return response.data;
  },

  updateProfile: async (profileData: any) => {
    const response = await api.put('/companies/profile', profileData);
    return response.data;
  },

  // Job Management
  createJob: async (jobData: any) => {
    const response = await api.post('/companies/jobs', jobData);
    return response.data;
  },

  getJobs: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await api.get('/companies/jobs', { params });
    return response.data;
  },

  getJob: async (jobId: string) => {
    const response = await api.get(`/companies/jobs/${jobId}`);
    return response.data;
  },

  updateJob: async (jobId: string, jobData: any) => {
    const response = await api.put(`/companies/jobs/${jobId}`, jobData);
    return response.data;
  },

  deleteJob: async (jobId: string) => {
    const response = await api.delete(`/companies/jobs/${jobId}`);
    return response.data;
  },

  // Matches
  getAllMatches: async (params?: { page?: number; limit?: number; status?: string; minScore?: number }) => {
    const response = await api.get('/companies/matches', { params });
    return response.data;
  },

  getJobMatches: async (jobId: string, params?: { page?: number; limit?: number; status?: string }) => {
    const response = await api.get(`/companies/jobs/${jobId}/matches`, { params });
    return response.data;
  },

  updateMatchStatus: async (jobId: string, matchId: string, status: string) => {
    const response = await api.put(`/companies/jobs/${jobId}/matches/${matchId}`, { status });
    return response.data;
  },

  // Applications
  getApplications: async (params?: { page?: number; limit?: number; status?: string; jobId?: string }) => {
    const response = await api.get('/companies/applications', { params });
    return response.data;
  },
};

export default companyApi;

