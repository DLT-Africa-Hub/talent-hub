// API Response Types

export interface ApiUser {
  id: string;
  email: string;
  role: 'admin' | 'company' | 'graduate';
  emailVerified: boolean;
  emailVerifiedAt?: string | Date;
  lastLoginAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ApiJob {
  _id?: string;
  id?: string;
  title: string;
  companyId?: {
    _id?: string;
    companyName?: string;
  };
  location?: string;
  status?: string;
  jobType?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  description?: string;
  requirements?: {
    skills?: string[];
  };
  createdAt?: string | Date;
  applicantsCount?: number;
  views?: number;
}

export interface ApiApplication {
  _id?: string;
  id?: string;
  graduateId?: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    position?: string;
    location?: string;
    skills?: string[];
    profilePictureUrl?: string;
    summary?: string;
    cv?: {
      fileUrl?: string;
      fileName?: string;
    };
    expYears?: number;
    rank?: string;
    salaryPerAnnum?: number;
  };
  jobId?: {
    _id?: string;
    id?: string;
    title?: string;
    location?: string;
    jobType?: string;
    salary?: {
      min?: number;
      max?: number;
      currency?: string;
    };
    directContact?: boolean;
    companyId?: {
      companyName?: string;
    };
  };
  matchId?: {
    _id?: string;
    score?: number;
  };
  status?: string;
  resume?: {
    fileUrl?: string;
    fileName?: string;
  };
  interviewScheduledAt?: string | Date;
  interviewRoomSlug?: string;
  createdAt?: string | Date;
}

export interface ApiMatch {
  _id?: string;
  id?: string;
  graduateId?: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    position?: string;
    location?: string;
    skills?: string[];
    profilePictureUrl?: string;
    summary?: string;
    cv?: {
      fileUrl?: string;
      fileName?: string;
    };
    expYears?: number;
    rank?: string;
    salaryPerAnnum?: number;
  };
  jobId?: {
    _id?: string;
    id?: string;
    title?: string;
    location?: string;
    jobType?: string;
    salary?: {
      min?: number;
      max?: number;
      currency?: string;
    };
    directContact?: boolean;
    companyId?: {
      companyName?: string;
    };
  };
  score?: number;
  status?: string;
}

export interface ApiNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  read: boolean;
  createdAt: string | Date;
}

export interface ApiResume {
  fileUrl: string;
  fileName: string;
  _id?: string;
  size?: number;
  publicId?: string;
  onDisplay?: boolean;
}

export interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message?: string;
}

export interface WorkExperience {
  _id?: string;
  company?: string;
  position?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  description?: string;
  [key: string]: unknown;
}

