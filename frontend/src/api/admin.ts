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
  getTalentCount: async () => {
    const response = await api.get('/admin/talent-count');
    console.log(response)
    return response.data;
  },
  getCompanyCount: async () => {
    const response = await api.get('/admin/company-count');
    console.log(response.data)
    return response.data;
  },
  getActiveJobsCount: async () => {
    const response = await api.get('/admin/active-jobs');
    return response.data;
  
  },
  getApplicationActivityDetail: async (params?: { jobId?: string; graduateId?: string;}) => {
    const response = await api.get('/admin/application-activity-detail', { params });
    return response.data;
  },
  getCompanyById: async (companyId: string) => {
    const response = await api.get(`/admin/get-a-company/${companyId}`);
    return response.data;
  },
  getCompaniesStats: async (params?: { page?: number; limit?: number; userId?: string }) => {
    const response = await api.get(`/admin/companies-stats`, {params});
    return response.data;
  },
  getAllGraduates: async (params?: {
    page?: number;
    limit?: number;
    q?: string;
    search?: string;
    rank?: string;
    position?: string;
    location?: string;
  }) => {
    const response = await api.get('/admin/graduates', { params });
    return response.data;
  },

  getGraduateById: async (graduateId: string) => {
    const response = await api.get(`/admin/graduates/${graduateId}`);
    return response.data;
  },

  getAllCompanies: async (params?: {
    page?: number;
    limit?: number;
    q?: string; // Search by name
    industry?: string;
    minSize?: number;
    maxSize?: number;
    location?: string;
  }) => {
    const response = await api.get('/admin/companies', { params });
    return response.data;
  },

  getCompanyDetails: async (companyId: string) => {
    const response = await api.get(`/admin/companies/${companyId}`);
    return response.data;
  },

  toggleCompanyStatus: async (companyId: string, active: boolean) => {
    const response = await api.put(`/admin/companies/${companyId}/status`, { active });
    return response.data;
  },

  //Job management

  getAllJobs: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    companyId?: string;
    jobType?: string;
    preferedRank?: string;
    location?: string;
    q?: string;
    search?: string;
  }) => {
    const response = await api.get('/admin/jobs', { params });
    return response.data;
  },

  getJobById: async (jobId: string) => {
    const response = await api.get(`/admin/jobs/${jobId}`);
    return response.data;
  },

  updateJob: async (jobId: string, jobData: {
    title?: string;
    jobType?: 'Full time' | 'Part time' | 'Contract' | 'Internship';
    description?: string;
    requirements?: {
      skills: string[];
      extraRequirements?: Array<{
        label: string;
        type: 'text' | 'url' | 'textarea';
        required: boolean;
        placeholder?: string;
      }>;
    };
    location?: string;
    salary?: {
      amount: number;
      currency: string;
    };
    preferedRank?: 'A' | 'B' | 'C' | 'D' | 'A and B' | 'B and C' | 'C and D';
    status?: 'active' | 'closed' | 'draft';
    directContact?: boolean;
  }) => {
    const response = await api.put(`/admin/jobs/${jobId}`, jobData);
    return response.data;
  },

  updateJobStatus: async (jobId: string, status: 'active' | 'closed' | 'draft') => {
    const response = await api.put(`/admin/jobs/${jobId}/status`, { status });
    return response.data;
  },

  deleteJob: async (jobId: string) => {
    const response = await api.delete(`/admin/jobs/${jobId}`);
    return response.data;
  },

  getJobStatistics: async () => {
    const response = await api.get('/admin/jobs/statistics');
    return response.data;
  },

  getJobApplications: async (jobId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => {
    const response = await api.get(`/admin/jobs/${jobId}/applications`, { params });
    return response.data;
  },

  
};


export default adminApi;
