import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CompanyCard, { Company } from '../../components/explore/CompanyCard';
import CompanyFlatCard from '../../components/explore/CompanyFlatCard';
import CompanyPreviewModal from '../../components/explore/CompanyPreviewModal';
import { graduateApi } from '../../api/graduate';
import {
  PageLoader,
  ErrorState,
  SectionHeader,
  EmptyState,
} from '../../components/ui';
import { ApiError } from '../../types/api';
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
    description?: string;
    requirements?: {
      skills?: string[];
      extraRequirements?: Array<{
        label: string;
        type: 'text' | 'url' | 'textarea';
        required: boolean;
        placeholder?: string;
      }>;
    };
    salary?: {
      min?: number;
      max?: number;
      currency?: string;
    };
  } | null;
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
  const queryClient = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState<
    (Company & { jobId: string }) | null
  >(null);
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

      // Handle null job case
      if (!job) {
        return {
          id: index + 1,
          name: 'Company',
          role: 'Position',
          match: normalizeMatchScore(match.score),
          contract: 'Full time',
          location: 'Location not specified',
          wageType: 'per year',
          wage: '—',
          image: DEFAULT_JOB_IMAGE,
          jobId: match.id,
          description: undefined,
        };
      }

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
        description: job.description,
      };
    },
    []
  );

  const {
    availableOpportunities,
    companyOffers,
  }: {
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
      // Skip matches with null jobs or filter them as needed
      if (match.job) {
        standardMatches.push(transformMatchToCompany(match, index));
      }
    });

    const sortedStandard = [...standardMatches].sort(
      (a, b) => b.match - a.match
    );

    return {
      availableOpportunities: sortedStandard.slice(0, 4),
      companyOffers: [],
    };
  }, [matchesData, transformMatchToCompany]);

  const error = useMemo(() => {
    if (!queryError) return null;
    const err = queryError as ApiError;
    return (
      err.response?.data?.message || 'Failed to load matches. Please try again.'
    );
  }, [queryError]);

  const handleButtonClick = (
    company: Company & { jobId?: string },
    buttonText: string
  ) => {
    if (buttonText === 'Preview') {
      setSelectedCompany(company as Company & { jobId: string });
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCompany(null);
  };

  const handleApply = () => {
    // Refresh matches and applications after successful application
    queryClient.invalidateQueries({ queryKey: ['graduateMatches'] });
    queryClient.invalidateQueries({ queryKey: ['graduateApplications'] });
  };

  return (
    <div className="py-[20px] px-[20px]  lg:px-0 lg:pr-[20px] flex flex-col gap-[43px] items-start justify-center overflow-y-auto h-full">
      {error && <ErrorState message={error} variant="inline" />}

      {loading && <PageLoader message="Loading opportunities..." />}

      {!loading && (
        <>
          <div className="flex flex-col gap-[20px] w-full md:gap-[30px] pt-[15px]">
            <SectionHeader title="AI Matched Opportunities" />

            {availableOpportunities.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 w-full">
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
              <EmptyState
                title="No opportunities yet"
                description="Full-time and part-time opportunities will appear here once you're matched with jobs."
                variant="minimal"
              />
            )}
          </div>

          <div className="flex flex-col gap-[20px] w-full md:gap-[30px]">
            <SectionHeader title="Contract offers" />

            {companyOffers.length > 0 ? (
              <div className="flex flex-col gap-4">
                {companyOffers.map((company) => (
                  <CompanyFlatCard
                    key={company.id}
                    company={company}
                    buttonText="Preview"
                    onButtonClick={() => handleButtonClick(company, 'Preview')}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No contract offers yet"
                description="Contract and internship opportunities will appear here once you're matched with jobs."
                variant="minimal"
              />
            )}
          </div>
        </>
      )}

      <CompanyPreviewModal
        isOpen={isModalOpen}
        company={selectedCompany}
        onClose={handleCloseModal}
        onApply={handleApply}
      />
    </div>
  );
};

export default GraduateDashboard;
