import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import CompanyCard, { Company } from '../../components/explore/CompanyCard';
import CompanyFlatCard from '../../components/explore/CompanyFlatCard';
import { graduateApi } from '../../api/graduate';
import { LoadingSpinner, JobPreviewModal } from '../../index';
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

const normalizeMatchScore = (score: number | undefined): number => {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return 0;
  }
  if (score > 1) {
    return Math.min(100, Math.round(score));
  }
  return Math.min(100, Math.round(score * 100));
};

const GraduateDashboard = () => {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedMatchScore, setSelectedMatchScore] = useState<number | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      const matchScore = normalizeMatchScore(match.score);
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
            : `${salaryRange} ${salaryType}`,
        image: DEFAULT_JOB_IMAGE,
        jobId: job.id,
      };
    },
    []
  );

  const { availableOpportunities, companyOffers }: {
    availableOpportunities: (Company & { jobId: string })[];
    companyOffers: (Company & { jobId: string })[];
  } = useMemo(() => {
    if (!matchesData || matchesData.length === 0) {
      return {
        availableOpportunities: [],
        companyOffers: [],
      };
    }

    const standardMatches: (Company & { jobId: string })[] = [];
    matchesData.forEach((match: Match, index: number) => {
      standardMatches.push(transformMatchToCompany(match, index));
    });

    const sortedStandard = [...standardMatches].sort((a, b) => b.match - a.match);

    return {
      availableOpportunities: sortedStandard.slice(0, 4),
      companyOffers: [],
    };
  }, [matchesData, transformMatchToCompany]);

  const error = useMemo(() => {
    if (!queryError) return null;
    const err = queryError as any;
    return (
      err.response?.data?.message || 'Failed to load matches. Please try again.'
    );
  }, [queryError]);

  // Get selected job data from matches
  const selectedJobData = useMemo(() => {
    if (!selectedJobId || !matchesData) return null;
    const match = matchesData.find((m: Match) => m.job?.id === selectedJobId);
    return match?.job || null;
  }, [selectedJobId, matchesData]);

  const handleButtonClick = (
    company: Company & { jobId?: string },
    buttonText: string
  ) => {
    const jobId = (company as Company & { jobId: string }).jobId;
    if (jobId) {
      if (buttonText === 'Preview') {
        // Find the match to get the score
        const match = matchesData?.find((m: Match) => m.job?.id === jobId);
        setSelectedMatchScore(match?.score);
        setSelectedJobId(jobId);
        setIsModalOpen(true);
      } else if (buttonText === 'Get in Touch') {
        // TODO: Handle contact action
        console.log('Get in Touch clicked for job:', jobId);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedJobId(null);
    setSelectedMatchScore(undefined);
  };

  const handleChat = () => {
    // TODO: Navigate to chat
    console.log('Chat clicked for job:', selectedJobId);
  };

  const handleApply = () => {
    // TODO: Handle application
    if (selectedJobId) {
      console.log('Apply clicked for job:', selectedJobId);
      // You can call graduateApi.applyToJob(selectedJobId) here
    }
  };

  return (
    <div className="py-[20px] px-[20px]  lg:px-0 lg:pr-[20px] flex flex-col gap-[43px] items-start justify-center overflow-y-auto h-full">
      {error && (
        <div className="w-full  rounded-[12px] bg-red-50 border  border-red-200 p-[16px]">
          <p className="text-[14px] text-red-600">{error}</p>
        </div>
      )}

      {loading && (
        <LoadingSpinner message="Loading opportunities..." fullPage />
      )}

      {!loading && (
        <>
        
          <div className="flex flex-col gap-[20px] w-full md:gap-[30px] mt-50">
            <p className="font-medium text-[22px] text-[#1C1C1C] mt-4">
              AI Matched Opportunities
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

            {companyOffers.length > 0 ? (
              <div className="flex flex-col gap-4">
                {companyOffers.map((company) => (
                  <CompanyFlatCard
                    key={company.id}
                    company={company}
                    buttonText="Preview"
                    onButtonClick={() =>
                      handleButtonClick(company, 'Preview')
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

      <JobPreviewModal
        isOpen={isModalOpen}
        jobId={selectedJobId}
        jobData={selectedJobData}
        matchScore={selectedMatchScore}
        onClose={handleCloseModal}
        onChat={handleChat}
        onApply={handleApply}
      />
    </div>
  );
};

export default GraduateDashboard;
