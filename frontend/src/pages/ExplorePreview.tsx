import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PiBuildingApartmentLight } from 'react-icons/pi';
import { BsSend } from 'react-icons/bs';
import { graduateApi } from '../api/graduate';
import {
  DEFAULT_JOB_IMAGE,
  formatSalaryRange,
  formatJobType,
  getSalaryType,
} from '../utils/job.utils';
import { PageLoader, ErrorState } from '../components/ui';
import { ApiError } from '../types/api';

const ExplorePreview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch match data from API
  const {
    data: matchData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['match', id],
    queryFn: async () => {
      if (!id) throw new Error('Match ID is required');
      const response = await graduateApi.getMatchById(id);
      return response.match;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full font-inter">
        <PageLoader message="Loading job details..." />
      </div>
    );
  }

  if (error || !matchData) {
    return (
      <div className="flex items-center justify-center h-screen w-full font-inter">
        <ErrorState
          message={
            (error as ApiError)?.response?.data?.message ||
            'Failed to load job details. Please try again.'
          }
          variant="inline"
        />
      </div>
    );
  }

  // Transform API data to component format
  const job = matchData.job;
  const matchScore =
    matchData.score > 1
      ? Math.min(100, Math.round(matchData.score))
      : Math.min(100, Math.round(matchData.score * 100));

  const jobType = job.jobType || 'Full time';
  const salaryRange = formatSalaryRange(job.salary);
  const salaryType = getSalaryType(jobType);
  const formattedJobType = formatJobType(jobType);

  // Extract company name from populated companyId
  const companyName =
    typeof job.companyId === 'object' &&
    job.companyId !== null &&
    'companyName' in job.companyId
      ? (job.companyId as any).companyName
      : job.companyName || 'Company';

  const jobTitle = job.title || 'Position';
  const location = job.location || 'Location not specified';
  const skills = job.requirements?.skills || [];
  const description =
    job.description || job.descriptionHtml || 'No description available.';

  const handleBack = () => {
    navigate('/explore');
  };

  const handleApply = () => {
    if (job.id) {
      navigate(`/graduate?apply=${job.id}`);
    }
  };

  return (
    <div className="flex items-center justify-center h-full lg:h-screen w-full font-inter px-[20px] py-[24px]">
      <div className="border flex flex-col gap-[20px] border-fade py-[45px] w-full h-full max-w-[1058px] lg:h-auto px-[15px] lg:px-[150px] rounded-[20px] bg-white">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleBack}
          className="self-end flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#F0F0F0] text-[#1C1C1C] transition hover:bg-[#E0E0E0]"
        >
          <span className="text-[20px] font-bold">×</span>
        </button>

        {/* Company Image */}
        <div className="w-full h-[232px] relative">
          <img
            src={DEFAULT_JOB_IMAGE}
            className="object-cover w-full h-full rounded-[10px]"
            alt={companyName}
          />
          <div className="absolute top-2 left-2 bg-white/20 backdrop-blur-xs text-[18px] border border-white/30 p-[12px] rounded-full shadow-lg">
            <PiBuildingApartmentLight className="text-[#F8F8F8]" />
          </div>
        </div>

        {/* Company and Job Details */}
        <div className="flex justify-between w-full">
          <div className="flex flex-col gap-[5px]">
            <p className="font-semibold text-[24px] text-[#1C1C1C] truncate">
              {companyName}
            </p>
            <p className="font-sf font-normal text-[16px] text-[#1C1C1CBF] truncate">
              {jobTitle}
            </p>
          </div>
          <div className="flex items-center h-[49px] bg-fade text-[#1C1C1CBF] text-[16px] py-[15px] px-6 rounded-[70px] shrink-0">
            {matchScore}% match
          </div>
        </div>

        {/* Job Description */}
        <div className="flex flex-col gap-5">
          <p className="font-semibold text-[20px] text-[#1C1C1C]">
            Job Description
          </p>
          {job.descriptionHtml ? (
            <div
              className="text-[16px] font-normal text-[#1C1C1CBF] leading-relaxed prose max-w-none"
              dangerouslySetInnerHTML={{ __html: job.descriptionHtml }}
            />
          ) : (
            <p className="text-[16px] font-normal text-[#1C1C1CBF] leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Skills */}
        <div className="flex flex-col gap-[27px]">
          {skills.length > 0 && (
            <div className="flex items-center gap-[6px] flex-wrap">
              {skills.map((skill: string) => (
                <button
                  key={skill}
                  className="border border-button text-button rounded-[50px] py-[5px] px-2.5 text-[14px]"
                >
                  {skill}
                </button>
              ))}
            </div>
          )}

          {/* Employment Information */}
          <div className="flex w-full items-center justify-between">
            <p className="text-center w-full font-semibold text-[16px]">
              {formattedJobType}
            </p>
            <div className="h-[20px] bg-black w-0.5" />
            <p className="text-center w-full font-semibold">{location}</p>
            <div className="h-[20px] bg-black w-0.5" />
            <p className="text-center w-full font-semibold">
              {salaryRange === 'Not specified'
                ? '—'
                : `${salaryRange} ${salaryType}`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row w-full gap-[15px] items-center justify-center">
            <button
              type="button"
              onClick={handleApply}
              className="w-full flex items-center justify-center gap-[12px] bg-button py-[15px] rounded-[10px] text-[#F8F8F8] cursor-pointer transition hover:bg-[#176300]"
            >
              <BsSend className="text-[24px]" />
              <p className="text-[16px] font-medium">Apply</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplorePreview;
