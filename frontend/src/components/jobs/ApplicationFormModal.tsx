import { useState, useRef, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import {
  FaUpload,
  FaFilePdf,
  FaTimes,
  FaExclamationTriangle,
} from 'react-icons/fa';
import BaseModal from '../ui/BaseModal';
import { Input, Textarea, Button } from '../ui';
import { graduateApi } from '../../api/graduate';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useApplicationSubmission } from '../../hooks/useApplicationSubmission';
import { useToastContext } from '../../context/ToastContext';

interface ApplicationFormModalProps {
  isOpen: boolean;
  jobId: string;
  jobTitle: string;
  extraRequirements?: Array<{
    label: string;
    type: 'text' | 'url' | 'textarea';
    required: boolean;
    placeholder?: string;
  }>;
  onClose: () => void;
  onSuccess?: () => void;
}

const ApplicationFormModal: React.FC<ApplicationFormModalProps> = ({
  isOpen,
  jobId,
  jobTitle,
  extraRequirements = [],
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [extraAnswers, setExtraAnswers] = useState<Record<string, string>>({});
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const { error: showError } = useToastContext();
  const [uploadedResume, setUploadedResume] = useState<{
    fileName: string;
    fileUrl: string;
    size: number;
    publicId?: string;
    onDisplay: boolean;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveToProfile, setSaveToProfile] = useState(false);

  // Check if graduate has CV in profile
  const { data: profileData } = useQuery({
    queryKey: ['graduateProfile'],
    queryFn: async () => {
      const response = await graduateApi.getProfile();
      return response.graduate || response;
    },
    enabled: isOpen,
  });

  const hasProfileCV =
    profileData?.cv &&
    Array.isArray(profileData.cv) &&
    profileData.cv.length > 0;

  // Handle CV upload
  const handleResumeUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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

    setIsUploadingResume(true);
    setUploadError(null);

    const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setUploadError('Missing Cloudinary configuration');
      setIsUploadingResume(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'resumes');

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const resumeData = {
        fileName: file.name,
        fileUrl: data.secure_url,
        size: file.size,
        publicId: data.public_id,
        onDisplay: true,
      };
      setUploadedResume(resumeData);

      // If user wants to save to profile, do it now
      if (saveToProfile) {
        try {
          await graduateApi.addCV(resumeData);
          queryClient.invalidateQueries({ queryKey: ['graduateProfile'] });
        } catch (error) {
          console.error('Failed to save CV to profile:', error);
          // Don't block the application if saving to profile fails
        }
      }
    } catch (error) {
      console.error('CV upload error:', error);
      setUploadError('Failed to upload CV. Please try again.');
    } finally {
      setIsUploadingResume(false);
    }
  };

  const removeResume = () => {
    setUploadedResume(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const {
    submitApplication,
    isSubmitting,
    submitError: submissionError,
    resetError,
  } = useApplicationSubmission({
    jobId,
    onSuccess: () => {
      setCoverLetter('');
      setExtraAnswers({});
      setUploadedResume(null);
      setUploadError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onSuccess?.();
      onClose();
    },
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCoverLetter('');
      setExtraAnswers({});
      setUploadedResume(null);
      setUploadError(null);
      resetError();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, resetError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate CV if not in profile
    if (!hasProfileCV && !uploadedResume) {
      showError('Please upload your CV to complete your application.');
      return;
    }

    // Validate required extra requirements
    const missingRequired = extraRequirements
      .filter((req) => req.required)
      .find(
        (req) => !extraAnswers[req.label] || !extraAnswers[req.label].trim()
      );

    if (missingRequired) {
      showError(`Please fill in the required field: ${missingRequired.label}`);
      return;
    }

    await submitApplication({
      resume: uploadedResume || undefined,
      coverLetter,
      extraAnswers:
        Object.keys(extraAnswers).length > 0 ? extraAnswers : undefined,
    });
  };

  const handleExtraAnswerChange = (label: string, value: string) => {
    setExtraAnswers((prev) => ({
      ...prev,
      [label]: value,
    }));
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-[24px] font-semibold text-[#1C1C1C]">
            Apply for {jobTitle}
          </h2>
          <p className="text-[14px] text-[#1C1C1C80] mt-1">
            Complete the form below to submit your application
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* CV Missing Warning */}
          {!hasProfileCV && !uploadedResume && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg flex items-start gap-3">
              <FaExclamationTriangle className="text-amber-600 text-[20px] mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="text-[16px] font-semibold text-amber-900 mb-1">
                  CV Required
                </h3>
                <p className="text-[14px] text-amber-800">
                  You don't have a CV in your profile. Please upload your CV
                  below to complete your application.
                </p>
              </div>
            </div>
          )}

          {/* CV Upload Section */}
          <div className="flex flex-col gap-2">
            <label className="text-[#1C1C1C] text-[16px] font-medium">
              {hasProfileCV ? 'Upload CV (optional)' : 'Upload CV *'}
            </label>
            <p className="text-[#1C1C1C80] text-[14px] font-normal">
              {hasProfileCV
                ? 'You can upload an additional CV for this application'
                : 'Upload your CV to complete your application. You can also save it to your profile for future use.'}
            </p>
            {!uploadedResume ? (
              <div className="flex flex-col gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleResumeUpload}
                  className="hidden"
                  id="resume-upload"
                />
                <label
                  htmlFor="resume-upload"
                  className={`flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg cursor-pointer transition ${
                    !hasProfileCV
                      ? 'border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 font-medium'
                      : 'border-fade hover:bg-[#F8F8F8]'
                  }`}
                >
                  <FaUpload
                    className={`text-[18px] ${!hasProfileCV ? 'text-amber-700' : 'text-[#1C1C1C80]'}`}
                  />
                  <span className="text-[14px]">
                    {isUploadingResume
                      ? 'Uploading...'
                      : !hasProfileCV
                        ? 'Upload CV (Required)'
                        : 'Choose CV file'}
                  </span>
                </label>
                {!hasProfileCV && (
                  <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[#F8F8F8] rounded-lg">
                    <input
                      type="checkbox"
                      checked={saveToProfile}
                      onChange={(e) => setSaveToProfile(e.target.checked)}
                      className="w-4 h-4 rounded border-fade text-button focus:ring-button"
                    />
                    <span className="text-[13px] text-[#1C1C1C]">
                      Save this CV to my profile for future applications
                    </span>
                  </label>
                )}
                {uploadError && (
                  <p className="text-[12px] text-red-600">{uploadError}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border border-fade rounded-lg bg-[#F8F8F8]">
                <div className="flex items-center gap-3">
                  <FaFilePdf className="text-[24px] text-red-600" />
                  <div className="flex flex-col">
                    <span className="text-[14px] font-medium text-[#1C1C1C]">
                      {uploadedResume.fileName}
                    </span>
                    <span className="text-[12px] text-[#1C1C1C80]">
                      {(uploadedResume.size / 1024).toFixed(2)} KB
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeResume}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <FaTimes className="text-[18px]" />
                </button>
              </div>
            )}
          </div>

          <Textarea
            label="Cover Letter (optional)"
            rows={5}
            placeholder="Tell us why you're interested in this position..."
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
          />

          {extraRequirements.map((req, index) => (
            <div key={index}>
              {req.type === 'textarea' ? (
                <Textarea
                  label={req.label}
                  rows={4}
                  placeholder={
                    req.placeholder || `Enter ${req.label.toLowerCase()}...`
                  }
                  value={extraAnswers[req.label] || ''}
                  onChange={(e) =>
                    handleExtraAnswerChange(req.label, e.target.value)
                  }
                  required={req.required}
                />
              ) : (
                <Input
                  type={req.type === 'url' ? 'url' : 'text'}
                  label={req.label}
                  placeholder={
                    req.placeholder || `Enter ${req.label.toLowerCase()}...`
                  }
                  value={extraAnswers[req.label] || ''}
                  onChange={(e) =>
                    handleExtraAnswerChange(req.label, e.target.value)
                  }
                  required={req.required}
                />
              )}
            </div>
          ))}

          {submissionError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[14px] text-red-600">{submissionError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <LoadingSpinner message="Submitting..." />
              ) : (
                'Submit Application'
              )}
            </Button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
};

export default ApplicationFormModal;
