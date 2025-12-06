import { useState, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompanyMatches, extractMatches } from '../../hooks/useCompanyData';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { companyApi } from '../../api/company';
import { LoadingSpinner } from '../../index';
import { EmptyState, SectionHeader } from '../../components/ui';
import CandidateCard from '../../components/company/CandidateCard';
import CandidatePreviewModal from '../../components/company/CandidatePreviewModal';
import ScheduleInterviewModal from '../../components/company/ScheduleInterviewModal';
import { CandidateProfile } from '../../types/candidates';
import { transformMatch } from '../../utils/candidate.utils';
import { ApiMatch } from '../../types/api';

const CompanyDashboard = () => {
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [multiSlotCandidate, setMultiSlotCandidate] =
    useState<CandidateProfile | null>(null);
  const [isMultiSlotModalOpen, setIsMultiSlotModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: matchesResponse, isLoading: loadingMatches } =
    useCompanyMatches({
      page: 1,
      limit: 100,
    });

  const scheduleInterviewMutation = useMutation({
    mutationFn: async ({
      applicationId,
      scheduledAt,
      durationMinutes,
    }: {
      applicationId: string;
      scheduledAt: string;
      durationMinutes?: number;
    }) => {
      return companyApi.scheduleInterview(applicationId, {
        scheduledAt,
        durationMinutes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyApplications'] });
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['interviews', 'company'] });
    },
  });

  // Mutation for suggesting multiple time slots
  const suggestTimeSlotsMutation = useMutation({
    mutationFn: async ({
      applicationId,
      timeSlots,
      companyTimezone,
      selectionDeadline,
    }: {
      applicationId: string;
      timeSlots: Array<{ date: string; duration: number }>;
      companyTimezone: string;
      selectionDeadline?: string;
    }) => {
      return companyApi.suggestTimeSlots({
        applicationId,
        timeSlots,
        companyTimezone,
        selectionDeadline,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyApplications'] });
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['interviews', 'company'] });
      setIsMultiSlotModalOpen(false);
      setMultiSlotCandidate(null);
    },
  });

  const transformMatchMemo = useCallback(
    (match: ApiMatch, index: number): CandidateProfile => {
      return transformMatch(match, index, {
        includeCompanyName: true,
        includeApplicationId: false,
      });
    },
    []
  );

  const matchesData = useMemo(
    () => extractMatches(matchesResponse),
    [matchesResponse]
  );

  const matchedCandidates = useMemo(() => {
    if (!matchesData || !Array.isArray(matchesData)) return [];
    return matchesData.map((match: ApiMatch, index: number) =>
      transformMatchMemo(match, index)
    );
  }, [matchesData, transformMatchMemo]);

  const loading = loadingMatches;

  const handlePreview = (candidate: CandidateProfile) => {
    setSelectedCandidate(candidate);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCandidate(null);
  };

  const handleScheduleInterview = useCallback(
    async (
      candidate: CandidateProfile,
      scheduledAt: string,
      durationMinutes?: number
    ) => {
      if (!candidate.applicationId) {
        throw new Error('Missing application reference for this candidate.');
      }
      await scheduleInterviewMutation.mutateAsync({
        applicationId: candidate.applicationId,
        scheduledAt,
        durationMinutes,
      });
    },
    [scheduleInterviewMutation]
  );

  const handleSuggestTimeSlots = useCallback((candidate: CandidateProfile) => {
    setMultiSlotCandidate(candidate);
    setIsMultiSlotModalOpen(true);
    setIsModalOpen(false);
  }, []);

  const handleViewCV = useCallback((candidate: CandidateProfile) => {
    const cvUrl = candidate.cv;
    if (cvUrl) {
      window.open(cvUrl, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const handleSubmitTimeSlots = useCallback(
    async (
      candidate: CandidateProfile,
      timeSlots: Array<{ date: string; duration: number }>,
      companyTimezone: string,
      selectionDeadline?: string
    ) => {
      if (!candidate.applicationId) {
        throw new Error('Missing application reference for this candidate.');
      }
      await suggestTimeSlotsMutation.mutateAsync({
        applicationId: candidate.applicationId,
        timeSlots,
        companyTimezone,
        selectionDeadline,
      });
    },
    [suggestTimeSlotsMutation]
  );

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner message="Loading dashboard..." fullPage />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="py-[24px] px-[24px]">
        <SectionHeader title="Matched Professionals" />
        {matchedCandidates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[20px]">
            {matchedCandidates.map((candidate: CandidateProfile) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onPreview={handlePreview}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No matches yet"
            description="Candidates matched to your job postings will appear here."
            variant="minimal"
          />
        )}
      </div>

      <CandidatePreviewModal
        isOpen={isModalOpen}
        candidate={selectedCandidate}
        onClose={handleCloseModal}
        onViewCV={handleViewCV}
        onScheduleInterview={
          selectedCandidate?.applicationId ? handleScheduleInterview : undefined
        }
        onSuggestTimeSlots={
          selectedCandidate?.applicationId ? handleSuggestTimeSlots : undefined
        }
        isSchedulingInterview={
          !!(
            scheduleInterviewMutation.isPending &&
            selectedCandidate?.applicationId &&
            scheduleInterviewMutation.variables?.applicationId ===
              selectedCandidate.applicationId
          )
        }
      />

      <ScheduleInterviewModal
        isOpen={isMultiSlotModalOpen}
        candidate={multiSlotCandidate}
        onClose={() => {
          setIsMultiSlotModalOpen(false);
          setMultiSlotCandidate(null);
        }}
        onSchedule={handleSubmitTimeSlots}
        isScheduling={suggestTimeSlotsMutation.isPending}
      />
    </DashboardLayout>
  );
};

export default CompanyDashboard;
