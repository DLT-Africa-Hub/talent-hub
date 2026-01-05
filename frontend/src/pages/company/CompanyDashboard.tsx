import { useState, useMemo, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import {
  HiInformationCircle,
  HiArrowRight,
  HiCheckCircle,
} from 'react-icons/hi2';
import {
  useCompanyMatches,
  extractMatches,
  useCompanyApplications,
  extractApplications,
} from '../../hooks/useCompanyData';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { companyApi } from '../../api/company';
import { LoadingSpinner } from '../../index';
import { EmptyState, SectionHeader } from '../../components/ui';
import CandidateCard from '../../components/company/CandidateCard';
import CandidatePreviewModal from '../../components/company/CandidatePreviewModal';
import ScheduleInterviewModal from '../../components/company/ScheduleInterviewModal';
import { CandidateProfile } from '../../types/candidates';
import {
  transformMatch,
  transformApplication,
} from '../../utils/candidate.utils';
import { ApiMatch, ApiApplication } from '../../types/api';
import { useToastContext } from '../../context/ToastContext';

const CompanyDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { success, error: showError } = useToastContext();
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

  const { data: applicationsResponse, isLoading: loadingApplications } =
    useCompanyApplications({
      page: 1,
      limit: 100,
    });

  // Fetch Calendly status
  const { data: calendlyStatus } = useQuery({
    queryKey: ['calendlyStatus'],
    queryFn: async () => {
      const response = await companyApi.getCalendlyStatus();
      return response;
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

  // Extract applications to map by graduateId and jobId
  const applicationsData = useMemo(
    () => extractApplications(applicationsResponse),
    [applicationsResponse]
  );

  // Create a map of applications by graduateId-jobId combination
  const applicationMap = useMemo(() => {
    const map = new Map<string, ApiApplication>();
    applicationsData.forEach((app: ApiApplication) => {
      const graduateId = app.graduateId?._id?.toString() || app.graduateId?._id;
      const jobId = app.jobId?._id?.toString() || app.jobId?.id;
      if (graduateId && jobId) {
        map.set(`${graduateId}-${jobId}`, app);
      }
    });
    return map;
  }, [applicationsData]);

  const transformMatchMemo = useCallback(
    (match: ApiMatch, index: number): CandidateProfile => {
      const graduateId =
        match.graduateId?._id?.toString() || match.graduateId?._id;
      const jobId = match.jobId?._id?.toString() || match.jobId?.id;

      // Check if there's an application for this match
      const application =
        graduateId && jobId
          ? applicationMap.get(`${graduateId}-${jobId}`)
          : undefined;

      // If application exists, use transformApplication to get applicationId
      if (application) {
        return transformApplication(application, index);
      }

      // Otherwise, use transformMatch
      return transformMatch(match, index, {
        includeCompanyName: true,
        includeApplicationId: false,
      });
    },
    [applicationMap]
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

  // Update selected candidate when matched candidates list changes (after mutation)
  useEffect(() => {
    if (selectedCandidate?.applicationId && matchedCandidates.length > 0) {
      const updatedCandidate = matchedCandidates.find(
        (c) => c.applicationId === selectedCandidate.applicationId
      );
      if (updatedCandidate) {
        setSelectedCandidate(updatedCandidate);
      }
    }
  }, [matchedCandidates, selectedCandidate?.applicationId]);

  const loading = loadingMatches || loadingApplications;

  const handlePreview = (candidate: CandidateProfile) => {
    setSelectedCandidate(candidate);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCandidate(null);
  };

  const handleViewCV = useCallback((candidate: CandidateProfile) => {
    const cvUrl = candidate.cv;
    if (cvUrl) {
      window.open(cvUrl, '_blank', 'noopener,noreferrer');
    }
  }, []);

  // Mutation for updating application status (accept/reject)
  const updateApplicationStatusMutation = useMutation({
    mutationFn: async ({
      applicationId,
      status,
    }: {
      applicationId: string;
      status: string;
    }) => {
      return companyApi.updateApplicationStatus(applicationId, status);
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['companyMatches'] });
      queryClient.invalidateQueries({ queryKey: ['companyApplications'] });
      queryClient.invalidateQueries({ queryKey: ['graduateMatches'] });

      // Update the selected candidate if it matches the updated application
      if (
        selectedCandidate?.applicationId === variables.applicationId &&
        data?.application
      ) {
        // Find the updated application in the applications data
        const updatedApp = data.application;
        const updatedCandidate = transformApplication(updatedApp, 0);
        setSelectedCandidate(updatedCandidate);
      }

      // If offer was sent, navigate to conversation
      if (
        variables.status === 'accepted' &&
        data?.offerSent &&
        data?.graduateUserId
      ) {
        window.location.href = `/messages/${data.graduateUserId}`;
      }
    },
  });

  const handleAccept = useCallback(
    (candidate: CandidateProfile) => {
      if (!candidate.applicationId) {
        showError('Missing application reference for this candidate.');
        return;
      }
      updateApplicationStatusMutation.mutate({
        applicationId: candidate.applicationId,
        status: 'accepted',
      });
    },
    [updateApplicationStatusMutation, showError]
  );

  const handleReject = useCallback(
    (candidate: CandidateProfile) => {
      if (!candidate.applicationId) {
        showError('Missing application reference for this candidate.');
        return;
      }
      updateApplicationStatusMutation.mutate({
        applicationId: candidate.applicationId,
        status: 'rejected',
      });
    },
    [updateApplicationStatusMutation, showError]
  );

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

  // Handle Calendly OAuth callback redirect
  useEffect(() => {
    const calendlyStatus = searchParams.get('calendly');

    if (calendlyStatus === 'connected') {
      success('Calendly account connected successfully!');
      // Invalidate Calendly status query to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['calendlyStatus'] });
      // Clean up URL
      searchParams.delete('calendly');
      setSearchParams(searchParams, { replace: true });
    } else if (calendlyStatus === 'error') {
      const errorMessage =
        searchParams.get('message') || 'Failed to connect Calendly account';
      showError(decodeURIComponent(errorMessage));
      // Clean up URL
      searchParams.delete('calendly');
      searchParams.delete('message');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, success, showError, queryClient]);

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner message="Loading dashboard..." fullPage />
      </DashboardLayout>
    );
  }

  const isCalendlyConnected =
    calendlyStatus?.connected && calendlyStatus?.enabled;

  return (
    <DashboardLayout>
      <div className="py-[24px] px-[24px]">
        {isCalendlyConnected ? (
          <div className="flex justify-end items-center">
            <HiCheckCircle className="text-[20px] text-green-600 shrink-0 " />

            <p className="text-[14px] text-green-800 font-medium ">
              <Link
                to="/company/profile"
                className="inline-flex items-center gap-[4px] underline "
              >
                Calendly Connected
              </Link>
            </p>
          </div>
        ) : (
          <div className="mb-[24px] p-[16px] rounded-[12px] bg-blue-50 border border-blue-200 flex items-start gap-[12px]">
            <HiInformationCircle className="text-[20px] text-blue-600 shrink-0 mt-[2px]" />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] text-blue-800 font-medium mb-[4px]">
                Calendly Not Connected
              </p>
              <p className="text-[13px] text-blue-700">
                Connect your Calendly account to enable interview scheduling for
                candidates.{' '}
                <Link
                  to="/company/profile"
                  className="inline-flex items-center gap-[4px] text-blue-800 font-semibold hover:text-blue-900 underline transition-colors"
                >
                  Connect now
                  <HiArrowRight className="text-[14px]" />
                </Link>
              </p>
            </div>
          </div>
        )}
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
        onAccept={selectedCandidate?.applicationId ? handleAccept : undefined}
        onReject={selectedCandidate?.applicationId ? handleReject : undefined}
        isAccepting={
          !!(
            updateApplicationStatusMutation.isPending &&
            selectedCandidate?.applicationId &&
            updateApplicationStatusMutation.variables?.status === 'accepted' &&
            updateApplicationStatusMutation.variables?.applicationId ===
              selectedCandidate.applicationId
          )
        }
        isRejecting={
          !!(
            updateApplicationStatusMutation.isPending &&
            selectedCandidate?.applicationId &&
            updateApplicationStatusMutation.variables?.status === 'rejected' &&
            updateApplicationStatusMutation.variables?.applicationId ===
              selectedCandidate.applicationId
          )
        }
        isCalendlyConnected={isCalendlyConnected}
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
