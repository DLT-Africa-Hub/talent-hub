import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import CompanyCard, { Company } from '../../components/explore/CompanyCard';
import { graduateApi } from '../../api/graduate';
import { LoadingSpinner } from '../../index';
import {
  DEFAULT_JOB_IMAGE,
  formatSalaryRange,
  formatJobType,
  getSalaryType,
} from '../../utils/job.utils';

interface Match {
  id: string;
  score: number;
  status: string;
  job: {
    id: string;
    title?: string;
    companyId?: string;
    companyName?: string;
    location?: string;
    jobType?: string;
    salary?: {
      min?: number;
      max?: number;
      currency?: string;
    };
  };
}

const GraduateDashboard = () => {
  const navigate = useNavigate();

  const {
    data: matchesData,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['graduateMatches'],
    queryFn: async () => {
      const response = await graduateApi.getMatches({ page: 1, limit: 100 });
      return response.matches || [];
    },
  });

  const transformMatchToCompany = useCallback(
    (match: Match, index: number): Company & { jobId: string } => {
      const job = match.job;
      const matchScore = Math.round(match.score * 100);
      const jobType = job.jobType || 'Full time';
      const salaryRange = formatSalaryRange(job.salary);
      const salaryType = getSalaryType(jobType);
      const formattedJobType = formatJobType(jobType);

      let contractString = formattedJobType;
      if (jobType === 'Contract') {
        contractString = 'Contract';
      } else if (jobType === 'Internship') {
        contractString = 'Internship';
      }

      const companyName = job.companyName || 'Company';

      const cardId =
        parseInt(job.id?.slice(-8) || match.id.slice(-8), 16) || index + 1;

      return {
        id: cardId,
        name: companyName,
        role: job.title || 'Position',
        match: matchScore,
        contract: contractString,
        location: job.location || 'Location not specified',
        wageType: salaryType,
        wage:
          salaryRange === 'Not specified'
            ? '—'
            : salaryRange.replace(/[k$]/g, ''),
        image: DEFAULT_JOB_IMAGE,
        jobId: job.id,
      };
    },
    []
  );

  const { availableOpportunities, contractOffers } = useMemo(() => {
    if (!matchesData || matchesData.length === 0) {
      return { availableOpportunities: [], contractOffers: [] };
    }

    const available: (Company & { jobId: string })[] = [];
    const contracts: (Company & { jobId: string })[] = [];

    matchesData.forEach((match: Match, index: number) => {
      const company = transformMatchToCompany(match, index);
      const jobType = match.job.jobType || 'Full time';

      if (jobType === 'Full time' || jobType === 'Part time') {
        available.push(company);
      } else {
        contracts.push(company);
      }
    });

    return {
      availableOpportunities: available.slice(0, 4),
      contractOffers: contracts.slice(0, 4),
    };
  }, [matchesData, transformMatchToCompany]);

  const error = useMemo(() => {
    if (!queryError) return null;
    const err = queryError as any;
    return (
      err.response?.data?.message || 'Failed to load matches. Please try again.'
    );
  }, [queryError]);

  const handleButtonClick = (
    company: Company & { jobId?: string },
    buttonText: string
  ) => {
    const jobId = (company as Company & { jobId: string }).jobId;
    if (jobId) {
      if (buttonText === 'Preview') {
        navigate(`/explore-preview/${jobId}`);
      } else if (buttonText === 'Get in Touch') {
        navigate(`/contactCompany/${jobId}`);
      }
    }
  };

  return (
    <div className="py-[20px] px-[20px] lg:px-0 lg:pr-[20px] flex flex-col gap-[43px] items-start justify-center overflow-hidden h-full">
      {error && (
        <div className="w-full rounded-[12px] bg-red-50 border border-red-200 p-[16px]">
          <p className="text-[14px] text-red-600">{error}</p>
        </div>
      )}

      {loading && (
        <LoadingSpinner message="Loading opportunities..." fullPage />
      )}

      {!loading && (
        <>
          <div className="flex flex-col gap-[20px] w-full md:gap-[30px]">
            <p className="font-medium text-[22px] text-[#1C1C1C]">
              Available Opportunities
            </p>

            {availableOpportunities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 flex-wrap gap-8 w-full">
                {availableOpportunities.map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    buttonText="Preview"
                    onButtonClick={() => handleButtonClick(company, 'Preview')}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-[60px] bg-white rounded-[16px] border border-fade">
                <div className="w-[100px] h-[100px] rounded-[16px] bg-[#E8F5E3] flex items-center justify-center mb-[20px]">
                  <div className="w-[64px] h-[64px] rounded-[10px] bg-[#DBFFC0] flex items-center justify-center">
                    <span className="text-[32px] text-button font-bold">×</span>
                  </div>
                </div>
                <p className="text-[16px] font-semibold text-[#1C1C1C] mb-[8px]">
                  No opportunities yet
                </p>
                <p className="text-[14px] text-[#1C1C1C80] text-center max-w-[400px]">
                  Full-time and part-time opportunities will appear here once
                  you're matched with jobs.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-[20px] w-full md:gap-[30px]">
            <p className="font-medium text-[22px] text-[#1C1C1C]">
              Contract offers
            </p>

            {contractOffers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 flex-wrap gap-8 w-full">
                {contractOffers.map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    buttonText="Get in Touch"
                    onButtonClick={() =>
                      handleButtonClick(company, 'Get in Touch')
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-[60px] bg-white rounded-[16px] border border-fade">
                <div className="w-[100px] h-[100px] rounded-[16px] bg-[#E8F5E3] flex items-center justify-center mb-[20px]">
                  <div className="w-[64px] h-[64px] rounded-[10px] bg-[#DBFFC0] flex items-center justify-center">
                    <span className="text-[32px] text-button font-bold">×</span>
                  </div>
                </div>
                <p className="text-[16px] font-semibold text-[#1C1C1C] mb-[8px]">
                  No contract offers yet
                </p>
                <p className="text-[14px] text-[#1C1C1C80] text-center max-w-[400px]">
                  Contract and internship opportunities will appear here once
                  you're matched with jobs.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GraduateDashboard;
