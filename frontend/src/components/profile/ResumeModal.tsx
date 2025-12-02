import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaTrash, FaEye, FaUpload, FaFilePdf, FaTimes } from 'react-icons/fa';
import { graduateApi } from '../../api/graduate';
import cloudinaryApi from '../../api/cloudinary';

interface CV {
  _id: string;
  fileName: string;
  fileUrl: string;
  size: number;
  publicId?: string;
  onDisplay: boolean;
}

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ResumeModal = ({ isOpen, onClose }: ResumeModalProps) => {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const {
    data: cvsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['graduateCVs'],
    queryFn: async () => {
      const response = await graduateApi.getCVs();
      return response.cvs || [];
    },
    enabled: isOpen,
  });

  const cvs: CV[] = cvsData || [];

  // Delete CV mutation with Cloudinary deletion
  const deleteMutation = useMutation({
    mutationFn: async (cv: CV) => {
      // First, delete from Cloudinary
      if (cv.fileUrl) {
        console.log(`Deleting CV from Cloudinary: ${cv.fileName}`);
        try {
          const cloudinaryResult = await cloudinaryApi.deleteCV(cv.fileUrl);
          console.log('Cloudinary deletion result:', cloudinaryResult);
        } catch (cloudinaryError: unknown) {
          const error = cloudinaryError as {
            response?: { data?: { message?: string } };
            message?: string;
          };
          console.error('Cloudinary deletion error:', error);
          console.warn(
            'Continuing with database deletion despite Cloudinary error'
          );
        }
      }

      // Then delete from database
      await graduateApi.deleteCV(cv._id);
    },
    onMutate: async (cv) => {
      // Add to deleting set to show loading state
      setDeletingIds((prev) => new Set(prev).add(cv._id));
    },
    onSuccess: (_, cv) => {
      queryClient.invalidateQueries({ queryKey: ['graduateCVs'] });
      console.log(`Successfully deleted CV: ${cv.fileName}`);
    },
    onError: (error: unknown) => {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      alert(err?.response?.data?.message || 'Failed to delete CV');
      console.error('Delete mutation error:', err);
    },
    onSettled: (_, __, cv) => {
      // Remove from deleting set
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cv._id);
        return newSet;
      });
    },
  });

  // Update display mutation
  const updateDisplayMutation = useMutation({
    mutationFn: async (cvId: string) => {
      await graduateApi.updateCVDisplay(cvId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graduateCVs'] });
    },
    onError: (error: unknown) => {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      alert(err?.response?.data?.message || 'Failed to update display CV');
    },
  });

  // Handle CV upload with progress tracking
  const handleCVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedMime = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (
      !allowedMime.includes(file.type) &&
      !/\.(pdf|docx?|PDF|DOCX?)$/.test(file.name)
    ) {
      setUploadError('Only PDF, DOC, and DOCX files are allowed');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setUploadError('Missing Cloudinary configuration');
      setIsUploading(false);
      return;
    }

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'graduates/cvs');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        console.log(`Upload progress: ${percent}%`);
      }
    };

    xhr.onload = async () => {
      try {
        const resp = JSON.parse(xhr.responseText);
        if (
          xhr.status >= 200 &&
          xhr.status < 300 &&
          (resp.secure_url || resp.url)
        ) {
          const secureUrl = resp.secure_url || resp.url;
          const publicId = resp.public_id || resp.publicId;

          console.log('File uploaded to Cloudinary:', {
            fileName: file.name,
            url: secureUrl,
            publicId,
          });

          // Save CV to backend
          await graduateApi.addCV({
            fileName: file.name,
            fileUrl: secureUrl,
            size: file.size,
            publicId: publicId,
            onDisplay: cvs.length === 0, // Set as display if it's the first CV
          });

          // Refresh CVs list
          queryClient.invalidateQueries({ queryKey: ['graduateCVs'] });

          // Reset file input
          event.target.value = '';
        } else {
          console.error('Cloudinary upload failed:', xhr.status, resp);
          setUploadError(`Upload failed (${xhr.status})`);
        }
      } catch (err) {
        console.error('Invalid Cloudinary response', err, xhr.responseText);
        setUploadError('Invalid response from Cloudinary');
      } finally {
        setIsUploading(false);
      }
    };

    xhr.onerror = () => {
      console.error('XHR error while uploading', xhr);
      setUploadError('Network error during upload');
      setIsUploading(false);
    };

    xhr.send(formData);
  };

  const handleDeleteCV = (cv: CV) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${cv.fileName}"? This will remove it from both Cloudinary and the database.`
      )
    ) {
      deleteMutation.mutate(cv);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50  p-4">
      <div className="bg-white rounded-[24px] w-full max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-[24px] border-b border-fade flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-semibold text-[#1C1C1C]">
              My Resumes
            </h2>
            <p className="text-[14px] text-[#1C1C1C80] mt-[4px]">
              Manage your CV documents
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-[8px] rounded-[10px] hover:bg-[#F4F4F4] transition-colors"
          >
            <FaTimes className="text-[20px] text-[#1C1C1C80]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-[24px]">
          {/* Upload Section */}
          <div className="mb-[24px]">
            <label
              htmlFor="cv-upload"
              className={`flex flex-col items-center justify-center p-[24px] border-2 border-dashed rounded-[16px] cursor-pointer transition-colors ${
                isUploading
                  ? 'border-[#1C1C1C80] bg-[#F4F4F4]'
                  : 'border-fade hover:border-button hover:bg-[#F8F8F8]'
              }`}
            >
              <FaUpload
                className={`text-[32px] mb-[12px] ${
                  isUploading ? 'text-[#1C1C1C80]' : 'text-button'
                }`}
              />
              <p className="text-[14px] font-medium text-[#1C1C1C]">
                {isUploading ? 'Uploading...' : 'Click to upload CV'}
              </p>
              <p className="text-[12px] text-[#1C1C1C80] mt-[4px]">
                PDF, DOC, DOCX only • Max 5MB
              </p>
              <input
                id="cv-upload"
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleCVUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
            {uploadError && (
              <p className="text-[12px] text-red-500 mt-[8px]">{uploadError}</p>
            )}
          </div>

          {/* CVs List */}
          {isLoading ? (
            <div className="text-center py-[32px]">
              <p className="text-[14px] text-[#1C1C1C80]">Loading CVs...</p>
            </div>
          ) : error ? (
            <div className="text-center py-[32px]">
              <p className="text-[14px] text-red-500">Failed to load CVs</p>
            </div>
          ) : cvs.length === 0 ? (
            <div className="text-center py-[32px]">
              <p className="text-[14px] text-[#1C1C1C80]">
                No CVs uploaded yet
              </p>
            </div>
          ) : (
            <div className="space-y-[12px]">
              {cvs.map((cv) => {
                const isDeleting = deletingIds.has(cv._id);

                return (
                  <div
                    key={cv._id}
                    className={`p-[16px] rounded-[16px] border transition-all ${
                      cv.onDisplay
                        ? 'border-button bg-[#F0F9F0]'
                        : 'border-fade bg-white hover:border-[#E0E0E0]'
                    } ${isDeleting ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-[12px]">
                      <div className="flex items-start gap-[12px] flex-1 min-w-0">
                        <div className="p-[12px] rounded-[10px] bg-white border border-fade">
                          <FaFilePdf className="text-[24px] text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-[#1C1C1C] truncate">
                            {cv.fileName}
                          </p>
                          <p className="text-[12px] text-[#1C1C1C80] mt-[4px]">
                            {formatFileSize(cv.size)}
                          </p>
                          {isDeleting && (
                            <p className="text-[11px] text-red-500 mt-[4px] font-medium">
                              Deleting from Cloudinary...
                            </p>
                          )}
                          {cv.onDisplay && !isDeleting && (
                            <span className="inline-block mt-[8px] px-[10px] py-[4px] rounded-[6px] bg-button text-white text-[11px] font-medium">
                              On Display
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-[8px]">
                        {!cv.onDisplay && (
                          <button
                            onClick={() => updateDisplayMutation.mutate(cv._id)}
                            disabled={
                              updateDisplayMutation.isPending || isDeleting
                            }
                            className="p-[10px] rounded-[10px] border border-fade hover:border-button hover:bg-[#F8F8F8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Set as display CV"
                          >
                            <FaEye className="text-[16px] text-[#1C1C1C80]" />
                          </button>
                        )}
                        <a
                          href={cv.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-[10px] rounded-[10px] border border-fade hover:border-button hover:bg-[#F8F8F8] transition-colors ${
                            isDeleting ? 'pointer-events-none opacity-50' : ''
                          }`}
                          title="View CV"
                        >
                          <FaFilePdf className="text-[16px] text-red-500" />
                        </a>
                        <button
                          onClick={() => handleDeleteCV(cv)}
                          disabled={isDeleting}
                          className="p-[10px] rounded-[10px] border border-fade hover:border-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
                          title="Delete CV"
                        >
                          {isDeleting ? (
                            <div className="animate-spin h-[16px] w-[16px] border-2 border-red-500 border-t-transparent rounded-full" />
                          ) : (
                            <FaTrash className="text-[16px] text-red-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-[24px] border-t border-fade">
          <button
            onClick={onClose}
            className="w-full px-[20px] py-[12px] rounded-[12px] border border-fade bg-white hover:bg-[#F4F4F4] transition-colors text-[14px] font-medium text-[#1C1C1C]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeModal;
