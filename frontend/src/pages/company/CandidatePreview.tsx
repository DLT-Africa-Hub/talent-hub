import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { HiOutlineBriefcase } from 'react-icons/hi';
import { HiArrowRight } from 'react-icons/hi';
import { CandidateProfile } from '../../types/candidates';
import { companyApi } from '../../api/company';
import {
  mapApplicationStatusToCandidateStatus,
  formatExperience,
  formatLocation,
  getCandidateRank,
  DEFAULT_PROFILE_IMAGE,
} from '../../utils/job.utils';
import { ApiApplication, ApiMatch } from '../../types/api';
import { LoadingSpinner, EmptyState } from '../../components/ui';

const CandidatePreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Transform API application to CandidateProfile
  const transformApplication = (app: ApiApplication): CandidateProfile => {
    const graduate = app.graduateId || {};
    const job = app.jobId || {};
    const candidateStatus = mapApplicationStatusToCandidateStatus(
      app.status || ''
    );
    const fullName =
      `${graduate.firstName || ''} ${graduate.lastName || ''}`.trim();

    return {
      id: app._id || '',
      applicationId: app._id?.toString(),
      jobId: job._id?.toString() || job.id?.toString(),
      jobTitle: job.title,
      name: fullName || 'Unknown Candidate',
      role: job.title || graduate.position || 'Developer',
      status: candidateStatus,
      rank: getCandidateRank(graduate.rank),
      statusLabel:
        candidateStatus.charAt(0).toUpperCase() + candidateStatus.slice(1),
      experience: formatExperience(graduate.expYears || 0),
      location: formatLocation(job.location || graduate.location),
      skills: graduate.skills || [],
      image: graduate.profilePictureUrl || DEFAULT_PROFILE_IMAGE,
      summary: graduate.summary,
      cv: typeof app.resume === 'string' ? app.resume : app.resume?.fileUrl,
      matchPercentage: app.matchId?.score
        ? app.matchId.score > 1
          ? Math.min(100, Math.round(app.matchId.score))
          : Math.min(100, Math.round(app.matchId.score * 100))
        : undefined,
      jobType: job.jobType,
      salary: job.salary,
      salaryPerAnnum: graduate.salaryPerAnnum,
      directContact: job.directContact !== false,
    };
  };

  // Transform API match to CandidateProfile
  const transformMatch = (match: ApiMatch): CandidateProfile => {
    const graduate = match.graduateId || {};
    const job = match.jobId || {};
    const fullName =
      `${graduate.firstName || ''} ${graduate.lastName || ''}`.trim();
    const matchScore = match.score
      ? match.score > 1
        ? Math.min(100, Math.round(match.score))
        : Math.min(100, Math.round(match.score * 100))
      : 0;

    return {
      id: match._id || '',
      jobId: job._id?.toString() || job.id?.toString(),
      jobTitle: job.title,
      name: fullName || 'Unknown Candidate',
      role: job.title || graduate.position || 'Developer',
      status: 'matched',
      rank: getCandidateRank(graduate.rank),
      statusLabel: 'Matched',
      experience: formatExperience(graduate.expYears || 0),
      location: formatLocation(job.location || graduate.location),
      skills: graduate.skills || [],
      image: graduate.profilePictureUrl || DEFAULT_PROFILE_IMAGE,
      summary: graduate.summary,
      cv: typeof graduate.cv === 'string' ? graduate.cv : graduate.cv?.fileUrl,
      matchPercentage: matchScore,
      jobType: job.jobType,
      salary: job.salary,
      salaryPerAnnum: graduate.salaryPerAnnum,
      directContact: job.directContact !== false,
    };
  };

  // Fetch applications
  const { data: applicationsResponse, isLoading: loadingApplications } =
    useQuery({
      queryKey: ['companyApplications'],
      queryFn: async () => {
        const response = await companyApi.getApplications({
          page: 1,
          limit: 100,
        });
        return response;
      },
    });

  // Fetch matches
  const { data: matchesResponse, isLoading: loadingMatches } = useQuery({
    queryKey: ['companyMatches'],
    queryFn: async () => {
      const response = await companyApi.getAllMatches({
        page: 1,
        limit: 100,
      });
      return response;
    },
  });

  // Extract and transform data
  const applicationsData = useMemo(() => {
    if (!applicationsResponse) return [];
    if (Array.isArray(applicationsResponse)) return applicationsResponse;
    if (
      applicationsResponse?.applications &&
      Array.isArray(applicationsResponse.applications)
    ) {
      return applicationsResponse.applications;
    }
    return [];
  }, [applicationsResponse]);

  const matchesData = useMemo(() => {
    if (!matchesResponse) return [];
    if (Array.isArray(matchesResponse)) return matchesResponse;
    if (matchesResponse?.matches && Array.isArray(matchesResponse.matches)) {
      return matchesResponse.matches;
    }
    return [];
  }, [matchesResponse]);

  // Find candidate by ID
  const candidate = useMemo(() => {
    if (!id) return null;

    // Check applications first
    const application = applicationsData.find(
      (app: ApiApplication) => app._id?.toString() === id
    );
    if (application) return transformApplication(application);

    // Check matches
    const match = matchesData.find((m: ApiMatch) => m._id?.toString() === id);
    if (match) return transformMatch(match);

    return null;
  }, [id, applicationsData, matchesData]);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyApplications'] });
      queryClient.invalidateQueries({ queryKey: ['companyCandidates'] });
      // Also invalidate job-specific queries used in the CandidatesListModal
      queryClient.invalidateQueries({ queryKey: ['jobApplicants'] });
      queryClient.invalidateQueries({ queryKey: ['jobMatches'] });
    },
  });

  const handleBack = () => {
    navigate('/candidates');
  };

  const handleChat = () => {
    if (candidate?.applicationId) {
      navigate('/messages');
    }
  };

  const handleAccept = () => {
    if (candidate?.applicationId) {
      updateApplicationStatusMutation.mutate({
        applicationId: candidate.applicationId,
        status: 'accepted',
      });
    }
  };

  const loading = loadingApplications || loadingMatches;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full font-inter">
        <LoadingSpinner message="Loading candidate..." />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex items-center justify-center h-screen w-full font-inter">
        <EmptyState
          title="Candidate not found"
          description="The candidate you're looking for doesn't exist."
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full lg:h-screen w-full font-inter px-[20px] py-[24px]">
      <div className="border flex flex-col gap-[24px] border-fade py-[45px] w-full h-full max-w-[1058px] lg:h-auto px-[15px] lg:px-[150px] rounded-[20px] bg-white">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleBack}
          className="self-end flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#F0F0F0] text-[#1C1C1C] transition hover:bg-[#E0E0E0]"
        >
          <span className="text-[20px] font-bold">×</span>
        </button>

        {/* Candidate Photo and Basic Info */}
        <div className="flex flex-col md:flex-row gap-[24px] items-start">
          <div className="relative h-[200px] w-[200px] shrink-0 overflow-hidden rounded-[16px]">
            <img
              src={candidate.image}
              alt={candidate.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute left-[14px] top-[14px] flex h-[44px] w-[44px] items-center justify-center rounded-full border border-white/40 bg-white/30 backdrop-blur-sm text-white">
              <HiOutlineBriefcase className="text-[22px]" />
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-[12px]">
            <div className="flex items-start justify-between gap-[16px]">
              <div className="flex flex-col gap-[4px]">
                <h1 className="text-[32px] font-semibold text-[#1C1C1C]">
                  {candidate.name}
                </h1>
                <p className="font-sf text-[18px] text-[#1C1C1CBF]">
                  {candidate.role}
                </p>
              </div>
              <div className="flex flex-col items-end gap-[8px]">
                <div className="flex items-center gap-[8px] rounded-full bg-button px-[14px] py-[8px]">
                  <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-white text-[14px] font-semibold text-button">
                    {candidate.rank}
                  </span>
                  <span className="text-[16px] font-semibold text-white">
                    {candidate.matchPercentage || 0}% match
                  </span>
                </div>
                <p className="text-[14px] font-normal text-[#1C1C1CBF]">
                  {candidate.statusLabel}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Section */}
        {candidate.summary && (
          <div className="flex flex-col gap-[12px]">
            <h2 className="text-[20px] font-semibold text-[#1C1C1C]">
              Summary
            </h2>
            <p className="text-[16px] leading-relaxed text-[#1C1C1CBF]">
              {candidate.summary}
            </p>
          </div>
        )}

        {/* Skills */}
        <div className="flex flex-wrap gap-[12px]">
          {candidate.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-button bg-white px-[16px] py-[8px] text-[14px] font-medium text-button"
            >
              {skill}
            </span>
          ))}
        </div>

        {/* Employment Details */}
        {(candidate.jobType ||
          candidate.location ||
          candidate.salary ||
          candidate.salaryPerAnnum) && (
          <div className="flex items-center gap-[16px] border-t border-[#E0E0E0] pt-[20px]">
            {candidate.jobType && (
              <>
                <div className="flex flex-col">
                  <span className="text-[18px] font-semibold text-[#1C1C1C]">
                    {candidate.jobType}
                  </span>
                </div>
                {(candidate.location ||
                  candidate.salary ||
                  candidate.salaryPerAnnum) && (
                  <div className="h-[40px] w-px bg-[#E0E0E0]" />
                )}
              </>
            )}
            {candidate.location && (
              <>
                <div className="flex flex-col">
                  <span className="text-[18px] font-semibold text-[#1C1C1C]">
                    {candidate.location}
                  </span>
                </div>
                {(candidate.salary || candidate.salaryPerAnnum) && (
                  <div className="h-[40px] w-px bg-[#E0E0E0]" />
                )}
              </>
            )}
            {(candidate.salary || candidate.salaryPerAnnum) && (
              <div className="flex flex-col">
                <span className="text-[18px] font-semibold text-[#1C1C1C]">
                  {candidate.salary
                    ? `${candidate.salary.currency || '$'}${candidate.salary.min || 0}k-${candidate.salary.max || 0}k`
                    : candidate.salaryPerAnnum
                      ? `$${candidate.salaryPerAnnum.toLocaleString()}`
                      : 'N/A'}
                </span>
                <span className="text-[14px] text-[#1C1C1CBF]">Annual</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row w-full gap-[15px] items-center justify-center pt-[8px]">
          <button
            type="button"
            onClick={handleChat}
            className="w-full flex items-center justify-center gap-[12px] rounded-[10px] border border-button bg-white py-[15px] text-[16px] font-medium text-button transition hover:bg-[#F8F8F8]"
          >
            <HiOutlineChatBubbleLeftRight className="text-[24px]" />
            Chat
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={
              !candidate.applicationId ||
              updateApplicationStatusMutation.isPending
            }
            className="w-full flex items-center justify-center gap-[12px] rounded-[10px] bg-button py-[15px] text-[16px] font-medium text-[#F8F8F8] transition hover:bg-[#176300] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateApplicationStatusMutation.isPending
              ? 'Accepting...'
              : 'Accept candidate'}
            <HiArrowRight className="text-[24px]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CandidatePreview;
