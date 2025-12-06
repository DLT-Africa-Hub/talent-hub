import api from './client';

// Profile Management
export const graduateApi = {
  // Get graduate profile
  getProfile: async () => {
    const response = await api.get('/graduates/profile');
    return response.data;
  },

  // Create graduate profile
  createProfile: async (profileData: Record<string, unknown>) => {
    const response = await api.post('/graduates/profile', profileData);
    return response.data;
  },

  // Update graduate profile
  updateProfile: async (profileData: Record<string, unknown>) => {
    const response = await api.put('/graduates/profile', profileData);
    return response.data;
  },

  // Update profile picture
  updateProfilePicture: async (profilePictureUrl: string) => {
    const response = await api.patch('/graduates/profile/picture', {
      profilePictureUrl,
    });
    return response.data;
  },

  // Skills Management
  replaceSkills: async (skills: string[]) => {
    const response = await api.put('/graduates/profile/skills', { skills });
    return response.data;
  },

  addSkill: async (skill: string) => {
    const response = await api.post('/graduates/profile/skills', { skill });
    return response.data;
  },

  removeSkill: async (skill: string) => {
    const response = await api.delete('/graduates/profile/skills', {
      data: { skill },
    });
    return response.data;
  },

  // Education Management
  updateEducation: async (education: Record<string, unknown>) => {
    const response = await api.put('/graduates/profile/education', education);
    return response.data;
  },

  // Work Experience Management
  addWorkExperience: async (experience: Record<string, unknown>) => {
    const response = await api.post(
      '/graduates/profile/work-experiences',
      experience
    );
    return response.data;
  },

  updateWorkExperience: async (
    experienceId: string,
    experience: Record<string, unknown>
  ) => {
    const response = await api.put(
      `/graduates/profile/work-experiences/${experienceId}`,
      experience
    );
    return response.data;
  },

  deleteWorkExperience: async (experienceId: string) => {
    const response = await api.delete(
      `/graduates/profile/work-experiences/${experienceId}`
    );
    return response.data;
  },

  // Assessment
  getAssessmentQuestions: async () => {
    const response = await api.get('/graduates/assessment/questions');
    return response.data;
  },

  submitAssessment: async (data: { answers: string[] }) => {
    const response = await api.post('/graduates/assessment', data);
    return response.data;
  },

  // Matches
  getMatches: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/graduates/matches', { params });
    return response.data;
  },

  getAvailableJobs: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    jobType?: string;
    sortBy?: string;
  }) => {
    const response = await api.get('/graduates/jobs', { params });
    return response.data;
  },

  getMatchById: async (matchId: string) => {
    const response = await api.get(`/graduates/matches/${matchId}`);
    return response.data;
  },

  // Applications
  applyToJob: async (
    jobId: string,
    data?: {
      coverLetter?: string;
      resume?: {
        fileName: string;
        fileUrl: string;
        size: number;
        publicId?: string;
        onDisplay?: boolean;
      };
      extraAnswers?: Record<string, string>;
    }
  ) => {
    const response = await api.post(`/graduates/apply/${jobId}`, data || {});
    return response.data;
  },

  alreadyApplied: async (jobId: string) => {
    const response = await api.get(`/graduates/apply/${jobId}/already-applied`);
    return response.data;
  },

  getInterviews: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    upcoming?: 'true' | 'false';
  }) => {
    const response = await api.get('/graduates/interviews', { params });
    return response.data;
  },

  // Get interviews pending time slot selection
  getPendingSelectionInterviews: async () => {
    const response = await api.get('/graduates/interviews/pending-selection');
    return response.data;
  },

  // Select a time slot for an interview
  selectTimeSlot: async (
    interviewId: string,
    payload: { slotId: string; graduateTimezone?: string }
  ) => {
    const response = await api.post(
      `/graduates/interviews/${interviewId}/select-slot`,
      payload
    );
    return response.data;
  },

  getApplications: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => {
    const response = await api.get('/graduates/applications', { params });
    return response.data;
  },

  updateApplicationStatus: async (applicationId: string, status: string) => {
    const response = await api.put(`/graduates/applications/${applicationId}`, {
      status,
    });

    return response.data;
  },

  getCVs: async () => {
    const response = await api.get('/graduates/profile/cv');
    return response.data;
  },

  addCV: async (cvData: {
    fileName: string;
    fileUrl: string;
    size: number;
    publicId?: string;
    onDisplay?: boolean;
  }) => {
    const response = await api.post('/graduates/profile/cv', cvData);
    return response.data;
  },

  deleteCV: async (cvId: string) => {
    const response = await api.delete(`/graduates/profile/cv/${cvId}`);
    return response.data;
  },

  updateCVDisplay: async (cvId: string) => {
    const response = await api.patch(`/graduates/profile/cv/${cvId}/display`);
    return response.data;
  },

  // Offer management
  getOffer: async (applicationId: string) => {
    const response = await api.get(`/graduates/offers/${applicationId}`);
    return response.data;
  },

  getOfferById: async (offerId: string) => {
    const response = await api.get(`/graduates/offers/by-id/${offerId}`);
    return response.data;
  },

  uploadSignedOffer: async (offerId: string, file: File) => {
    const formData = new FormData();
    formData.append('signedOffer', file);
    const response = await api.post(
      `/graduates/offers/${offerId}/upload-signed`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  acceptOffer: async (offerId: string) => {
    const response = await api.post(`/graduates/offers/${offerId}/accept`);
    return response.data;
  },

  rejectOffer: async (offerId: string) => {
    const response = await api.post(`/graduates/offers/${offerId}/reject`);
    return response.data;
  },
};

export default graduateApi;
