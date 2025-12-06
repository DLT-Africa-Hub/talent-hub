import { useState, useEffect, useCallback } from 'react';
import { graduateApi } from '../api/graduate';
import { Company } from '../components/explore/CompanyCard';

interface UseApplyToJobOptions {
  jobId?: string;
  isOpen?: boolean; // For modals that check when opened
}

interface UseApplyToJobReturn {
  hasApplied: boolean;
  checkingApplied: boolean;
  handleApply: (
    company: Company,
    onModalOpen?: (companyId: number) => void
  ) => void;
  resetAppliedStatus: () => void;
}

/**
 * Reusable hook for handling job application logic
 * - Checks if user has already applied
 * - Provides handler to open application modal
 * - Manages applied status state
 */
export const useApplyToJob = ({
  jobId,
  isOpen,
}: UseApplyToJobOptions = {}): UseApplyToJobReturn => {
  const [hasApplied, setHasApplied] = useState(false);
  const [checkingApplied, setCheckingApplied] = useState(false);

  // Check if already applied when jobId is provided
  useEffect(() => {
    if (!jobId) {
      setHasApplied(false);
      setCheckingApplied(false);
      return;
    }

    // For modals, only check when modal is open
    if (isOpen !== undefined && !isOpen) {
      return;
    }

    const checkApplied = async () => {
      try {
        setCheckingApplied(true);
        const res = await graduateApi.alreadyApplied(jobId);
        setHasApplied(res.applied);
      } catch (err) {
        console.error('Failed to check application status', err);
        setHasApplied(false);
      } finally {
        setCheckingApplied(false);
      }
    };

    checkApplied();
  }, [jobId, isOpen]);

  // Handle apply click - opens preview modal for full application flow
  const handleApply = useCallback(
    (company: Company, onModalOpen?: (companyId: number) => void) => {
      if (!company.jobId) {
        console.warn('Cannot apply: jobId is missing');
        return;
      }

      // Open the preview modal which handles the full application flow
      onModalOpen?.(company.id);
    },
    []
  );

  // Reset applied status and re-check
  const resetAppliedStatus = useCallback(() => {
    if (!jobId) return;

    const checkApplied = async () => {
      try {
        setCheckingApplied(true);
        const res = await graduateApi.alreadyApplied(jobId);
        setHasApplied(res.applied);
      } catch (err) {
        console.error('Failed to check application status', err);
        setHasApplied(false);
      } finally {
        setCheckingApplied(false);
      }
    };

    checkApplied();
  }, [jobId]);

  return {
    hasApplied,
    checkingApplied,
    handleApply,
    resetAppliedStatus,
  };
};
