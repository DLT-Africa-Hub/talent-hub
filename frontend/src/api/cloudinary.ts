// cloudinaryApi.ts
import api from './client';

// Types
export type ResourceType = 'image' | 'video' | 'raw';

export interface DeleteFilePayload {
  url: string;
  resourceType?: ResourceType;
}

export interface DeleteMultiplePayload {
  urls: (string | { url: string; resourceType?: ResourceType })[];
}

export interface DeleteFolderPayload {
  folder: string;
  resourceType?: ResourceType;
}

export interface DeleteResult {
  url?: string;
  publicId: string;
  resourceType: ResourceType;
  success: boolean;
  result?: string;
  error?: string;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
  data?: {
    publicId: string;
    resourceType: ResourceType;
    result: string;
  };
  error?: string;
}

export interface DeleteMultipleResponse {
  success: boolean;
  message: string;
  data?: {
    total: number;
    successful: number;
    failed: number;
    results: DeleteResult[];
  };
  error?: string;
}

export interface DeleteFolderResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
}

// Cloudinary Management API
export const cloudinaryApi = {
 
  deleteFile: async (url: string, resourceType?: ResourceType): Promise<DeleteResponse> => {
    const response = await api.post('/cloudinary/delete', {
      url,
      resourceType,
    } as DeleteFilePayload);
    return response.data;
  },


  deleteMultipleFiles: async (
    urls: (string | { url: string; resourceType?: ResourceType })[]
  ): Promise<DeleteMultipleResponse> => {
    const response = await api.post('/cloudinary/delete-multiple', {
      urls,
    } as DeleteMultiplePayload);
    return response.data;
  },


  deleteFolder: async (
    folder: string,
    resourceType: ResourceType = 'image'
  ): Promise<DeleteFolderResponse> => {
    const response = await api.post('/cloudinary/delete-folder', {
      folder,
      resourceType,
    } as DeleteFolderPayload);
    return response.data;
  },


  deleteImage: async (url: string): Promise<DeleteResponse> => {
    return cloudinaryApi.deleteFile(url, 'image');
  },

 
  deleteVideo: async (url: string): Promise<DeleteResponse> => {
    return cloudinaryApi.deleteFile(url, 'video');
  },

 
  deleteDocument: async (url: string): Promise<DeleteResponse> => {
    return cloudinaryApi.deleteFile(url, 'raw');
  },

  
  deleteProfilePicture: async (url: string): Promise<DeleteResponse> => {
    return cloudinaryApi.deleteFile(url, 'image');
  },

 
  deleteCV: async (url: string): Promise<DeleteResponse> => {
    return cloudinaryApi.deleteFile(url, 'raw');
  },


  deleteMultipleImages: async (urls: string[]): Promise<DeleteMultipleResponse> => {
    const urlsWithType = urls.map(url => ({ url, resourceType: 'image' as ResourceType }));
    return cloudinaryApi.deleteMultipleFiles(urlsWithType);
  },

  deleteMultipleDocuments: async (urls: string[]): Promise<DeleteMultipleResponse> => {
    const urlsWithType = urls.map(url => ({ url, resourceType: 'raw' as ResourceType }));
    return cloudinaryApi.deleteMultipleFiles(urlsWithType);
  },

  
  deleteMultipleVideos: async (urls: string[]): Promise<DeleteMultipleResponse> => {
    const urlsWithType = urls.map(url => ({ url, resourceType: 'video' as ResourceType }));
    return cloudinaryApi.deleteMultipleFiles(urlsWithType);
  },
};

export default cloudinaryApi;