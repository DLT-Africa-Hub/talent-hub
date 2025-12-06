import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graduateApi } from '../api/graduate';
import { ApiResume, ApiError } from '../types/api';

interface ApplicationData {
  resume?: ApiResume | File | string;
  coverLetter?: string;
  extraAnswers?: Record<string, string>;
}

interface UseApplicationSubmissionOptions {
  jobId: string;
  onSuccess?: () => void;
  onError?: (error: ApiError) => void;
}

export const useApplicationSubmission = ({
  jobId,
  onSuccess,
  onError,
}: UseApplicationSubmissionOptions) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const applicationMutation = useMutation({
    mutationFn: async (data: ApplicationData) => {
      // Convert resume to the expected format
      let resume:
        | {
            fileName: string;
            fileUrl: string;
            size: number;
            publicId?: string;
            onDisplay?: boolean;
          }
        | undefined = undefined;
      if (data.resume) {
        if (
          typeof data.resume === 'object' &&
          'fileUrl' in data.resume &&
          'fileName' in data.resume
        ) {
          const apiResume = data.resume as ApiResume;
          // Ensure size is present (default to 0 if missing)
          if (apiResume.size !== undefined) {
            resume = {
              fileName: apiResume.fileName,
              fileUrl: apiResume.fileUrl,
              size: apiResume.size,
              publicId: apiResume.publicId,
              onDisplay: apiResume.onDisplay,
            };
          }
        }
        // If it's a File or string, we skip it (should be handled elsewhere)
      }

      return await graduateApi.applyToJob(jobId, {
        coverLetter: data.coverLetter?.trim() || undefined,
        resume: resume,
        extraAnswers:
          data.extraAnswers && Object.keys(data.extraAnswers).length > 0
            ? data.extraAnswers
            : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graduateApplications'] });
      queryClient.invalidateQueries({ queryKey: ['graduates/matches'] });
      setSubmitError(null);
      setIsSubmitting(false);
      onSuccess?.();
    },
    onError: (error: ApiError) => {
      const errorMessage =
        error?.response?.data?.message ||
        'Failed to submit application. Please try again.';
      setSubmitError(errorMessage);
      setIsSubmitting(false);
      onError?.(error);
    },
  });

  const submitApplication = async (data: ApplicationData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    applicationMutation.mutate(data);
  };

  return {
    submitApplication,
    isSubmitting,
    submitError,
    resetError: () => setSubmitError(null),
  };
};
