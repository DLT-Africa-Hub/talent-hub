import { PiBuildingApartmentLight } from 'react-icons/pi';
import { BsSend } from 'react-icons/bs';
import { useParams } from 'react-router-dom';
import React from 'react';
import { CiMail } from 'react-icons/ci';
import { useQuery } from '@tanstack/react-query';
import { graduateApi } from '../../api/graduate';
import { LoadingSpinner, EmptyState } from '../../components/ui';
import {
  formatSalaryRange,
  getSalaryType,
  formatJobType,
  DEFAULT_JOB_IMAGE,
} from '../../utils/job.utils';
import { ApiJob } from '../../types/api';

export interface Company {
  name: string;
  role: string;
  match: number;
  contract: string;
  location: string;
  wageType: string;
  wage: string;
  image: string;
  jobDesc: string;
  id: number;
  skills: string[];
}

interface CompanyPreviewProps {
  mode: string;
}

const CompanyPreview: React.FC<CompanyPreviewProps> = ({
  mode = 'application',
}) => {
  const { id } = useParams();

  const {
    data: jobData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['jobPreview', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await graduateApi.getAvailableJobs({
        page: 1,
        limit: 100,
      });
      const jobs = response.jobs || [];
      return jobs.find(
        (job: ApiJob) => job.id === id || job._id?.toString() === id
      );
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !jobData) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <EmptyState
          title="Company not found"
          description="The company you're looking for doesn't exist."
        />
      </div>
    );
  }

  const salaryRange = formatSalaryRange(jobData.salary);
  const salaryType = jobData.jobType
    ? getSalaryType(jobData.jobType)
    : 'Annual';
  const formattedJobType = jobData.jobType
    ? formatJobType(jobData.jobType)
    : 'Full-time';

  const company: Company = {
    id: Number(id) || 0,
    name: jobData.companyName || 'Unknown Company',
    role: jobData.title || 'Position',
    match: jobData.matchScore
      ? jobData.matchScore > 1
        ? Math.min(100, Math.round(jobData.matchScore))
        : Math.min(100, Math.round(jobData.matchScore * 100))
      : 0,
    contract: formattedJobType,
    location: jobData.location || 'Not specified',
    wageType: salaryType,
    wage: salaryRange === 'Not specified' ? 'Not specified' : salaryRange,
    image: jobData.image || DEFAULT_JOB_IMAGE,
    jobDesc: jobData.description || 'No description available.',
    skills: jobData.requirements?.skills || [],
  };

  return (
    <div className="flex items-center justify-center h-full lg:h-screen w-full font-inter">
      <div className="border flex flex-col gap-[20px] border-fade py-[45px] w-full h-full max-w-[1058px] lg:h-auto px-[15px] lg:px-[150px] rounded-[20px] ">
        <div className="w-full h-[232px] relative">
          <img
            src={company.image}
            className="object-cover w-full h-full rounded-[10px]"
            alt={company.name}
          />
          <div className="absolute top-2 left-2 bg-white/20 backdrop-blur-xs text-[18px] border border-white/30 p-[12px] rounded-full shadow-lg">
            <PiBuildingApartmentLight className="text-[#F8F8F8]" />
          </div>
        </div>
        <div className="flex justify-between w-full">
          <div className="flex flex-col gap-[5px]">
            <p className="font-semibold text-[24px] max-w-[114px] text-[#1C1C1C]">
              {company.name}
            </p>
            <p className="font-sf font-normal text-[16px] max-w-[114px]  text-[#1C1C1CBF]">
              {company.role}
            </p>
          </div>
          <div className="flex items-center  h-[49px]  bg-fade text-[#1C1C1CBF] text-[16px]  py-[15px] px-6 rounded-[70px]">
            {company.match}% match
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <p className="font-semibold text-[20px] text-[#1C1C1C]">
            Job Description
          </p>
          <p className="text-[16px] font-normal text-[#1C1C1CBF] leading-relaxed">
            {company.jobDesc}
          </p>
        </div>

        <div className="flex flex-col gap-[27px]">
          <div className="flex items-center gap-[6px]">
            {company.skills.map((skill) => (
              <button className="border border-button text-button rounded-[50px] py-[5px] px-2.5 text-[14px]">
                {skill}
              </button>
            ))}
          </div>

          <div className="flex w-full items-center  justify-between ">
            <p className="text-center w-full font-semibold text-[16px]">
              {company.contract}
            </p>
            <div className="h-[20px] bg-black w-0.5" />
            <p className="text-center w-full font-semibold ">
              {company.location}
            </p>
            <div className="h-[20px] bg-black w-0.5" />
            <p className="text-center w-full font-semibold ">
              {company.wage} {company.wageType}
            </p>
          </div>

          {mode === 'application' ? (
            <div className="flex flex-col md:flex-row w-full gap-[15px] items-center justify-center">
              <button className="w-full  flex items-center justify-center gap-[12px] bg-button py-[15px] rounded-[10px] text-[#F8F8F8] cursor-pointer">
                <BsSend className="text-[24px]" />
                <p className="text-[16px] font-medium">View CV</p>
              </button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row w-full gap-[15px] items-center justify-center">
              <button className="w-full  flex items-center justify-center gap-[12px] bg-button py-[15px] rounded-[10px] text-[#F8F8F8] cursor-pointer">
                <CiMail className="text-[24px]" />
                <p className="text-[16px] font-medium">Get in Touch</p>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyPreview;
