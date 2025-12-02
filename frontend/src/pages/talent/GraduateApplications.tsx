import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BsSearch, BsFilter } from 'react-icons/bs';
import { HiOutlineX } from 'react-icons/hi';
import { MdCheckCircle, MdPending, MdCancel } from 'react-icons/md';

import CompanyCard, { Company } from '../../components/explore/CompanyCard';
import CompanyFlatCard from '../../components/explore/CompanyFlatCard';
import CompanyPreviewModal from '../../components/explore/CompanyPreviewModal';
import { graduateApi } from '../../api/graduate';
import {
  EmptyState,
  SectionHeader,
  InlineLoader,
  ErrorState,
} from '../../components/ui';
import {
  DEFAULT_JOB_IMAGE,
  formatSalaryRange,
  formatJobType,
  getSalaryType,
} from '../../utils/job.utils';

interface Application {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'reviewed';
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
  createdAt?: string;
  updatedAt?: string;
}

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

const GraduateApplications = () => {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch applications
  const {
    data: applicationsData,
    isLoading: applicationsLoading,
    error: applicationsError,
  } = useQuery({
    queryKey: ['graduateApplications'],
    queryFn: async () => {
      const response = await graduateApi.getApplications({
        page: 1,
        limit: 100,
      });
      return response.applications || [];
    },
  });

  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['quickApplyMatches'],
    queryFn: async () => {
      const response = await graduateApi.getMatches({ page: 1, limit: 10 });
      return response.matches || [];
    },
  });

  const transformApplicationToCompany = useCallback(
    (
      application: Application,
      index: number
    ): Company & { status: string; applicationId: string } => {
      const job = application.job;
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

      // Extract companyName from populated structure
      const companyName =
        job.companyName ||
        (job.companyId &&
        typeof job.companyId === 'object' &&
        'companyName' in job.companyId
          ? (job.companyId as { companyName?: string }).companyName
          : null) ||
        'Company';

      const cardId =
        parseInt(job.id?.slice(-8) || application.id.slice(-8), 16) ||
        index + 1;

      return {
        id: cardId,
        name: companyName,
        role: job.title || 'Position',
        match: 0, // Applications don't have match scores
        contract: contractString,
        location: job.location || 'Location not specified',
        wageType: salaryType,
        wage:
          salaryRange === 'Not specified'
            ? '—'
            : `${salaryRange} ${salaryType}`,
        image: DEFAULT_JOB_IMAGE,
        description: (job as { description?: string }).description || '',
        status: application.status,
        applicationId: application.id,
      };
    },
    []
  );

  // Transform match to Company format for Quick Apply
  const transformMatchToCompany = useCallback(
    (match: Match, index: number): Company => {
      const job = match.job;
      const rawScore = typeof match.score === 'number' ? match.score : 0;
      const matchScore =
        rawScore > 1
          ? Math.min(100, Math.round(rawScore))
          : Math.min(100, Math.round(rawScore * 100));
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

      // Extract companyName from populated structure
      const companyName =
        job.companyName ||
        (job.companyId &&
        typeof job.companyId === 'object' &&
        'companyName' in job.companyId
          ? (job.companyId as { companyName?: string }).companyName
          : null) ||
        'Company';

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
        description: (job as { description?: string }).description || '',
      };
    },
    []
  );

  // Transform applications
  const applications = useMemo(() => {
    if (!applicationsData || applicationsData.length === 0) return [];
    return applicationsData.map((app: Application, index: number) =>
      transformApplicationToCompany(app, index)
    );
  }, [applicationsData, transformApplicationToCompany]);

  // Transform matches for Quick Apply
  const quickApplyJobs = useMemo(() => {
    if (!matchesData || matchesData.length === 0) return [];
    return matchesData
      .slice(0, 5)
      .map((match: Match, index: number) =>
        transformMatchToCompany(match, index)
      );
  }, [matchesData, transformMatchToCompany]);

  // Filter applications
  const filteredApplications = useMemo(() => {
    let filtered = [...applications];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.name.toLowerCase().includes(query) ||
          app.role.toLowerCase().includes(query) ||
          app.location.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [applications, statusFilter, searchQuery]);

  const handlePreviewClick = (companyId: number) => {
    const company = [...applications, ...quickApplyJobs].find(
      (c: Company) => c.id === companyId
    );
    if (company) {
      setSelectedCompany(company);
      setIsModalOpen(true);
    }
  };

  const handleApplyClick = (companyId: number) => {
    console.log('apply clicked', companyId);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCompany(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        label: 'Pending',
        icon: MdPending,
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      },
      accepted: {
        label: 'Accepted',
        icon: MdCheckCircle,
        className: 'bg-green-50 text-green-700 border-green-200',
      },
      rejected: {
        label: 'Rejected',
        icon: MdCancel,
        className: 'bg-red-50 text-red-700 border-red-200',
      },
      reviewed: {
        label: 'Under Review',
        icon: MdPending,
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium border ${config.className}`}
      >
        <Icon className="text-[14px]" />
        {config.label}
      </span>
    );
  };

  const statusTypes = ['all', 'pending', 'reviewed', 'accepted', 'rejected'];

  return (
    <>
      <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-100px)] px-[20px] lg:px-[40px] py-[20px] gap-[46px] overflow-hidden">
        {/* === MOBILE VIEW === */}
        <div className="flex flex-col gap-[40px] lg:hidden w-full">
          {/* Header with Search and Filters */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h1 className="font-semibold text-[24px] text-[#1C1C1C]">
                Job Applications
              </h1>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-[10px] transition-all ${
                  showFilters || statusFilter !== 'all'
                    ? 'border-button bg-button/5 text-button'
                    : 'border-fade bg-white text-[#1C1C1C]'
                }`}
              >
                <BsFilter className="text-[16px]" />
              </button>
            </div>

            {/* Search */}
            <div className="flex gap-2.5 items-center text-fade px-4 py-2.5 border border-fade rounded-[10px] bg-white">
              <BsSearch className="text-[16px] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full placeholder:text-fade text-[#1c1c1c] outline-none bg-transparent text-[14px]"
                placeholder="Search applications..."
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-fade"
                >
                  <HiOutlineX className="text-[16px]" />
                </button>
              )}
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-[#F8F8F8] rounded-[12px] border border-fade">
                {statusTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setStatusFilter(type)}
                    className={`px-3 py-1.5 rounded-[20px] text-[12px] font-medium transition-all capitalize ${
                      statusFilter === type
                        ? 'bg-button text-white'
                        : 'bg-white text-[#1C1C1C] border border-fade'
                    }`}
                  >
                    {type === 'all' ? 'All' : type}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Applications List */}
          {applicationsLoading ? (
            <InlineLoader message="Loading applications..." />
          ) : filteredApplications.length === 0 ? (
            <EmptyState
              icon={
                <div className="w-20 h-20 rounded-full bg-fade flex items-center justify-center mb-4">
                  <MdPending className="text-[32px] text-[#1C1C1C40]" />
                </div>
              }
              title="No applications found"
              description={
                applications.length === 0
                  ? "You haven't applied to any jobs yet."
                  : 'Try adjusting your filters.'
              }
              variant="minimal"
            />
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredApplications.map(
                (app: Company & { status?: string }) => (
                  <div key={app.id} className="relative">
                    <CompanyCard
                      company={app}
                      buttonText="Preview"
                      onPreviewClick={handlePreviewClick}
                    />
                    {app.status && (
                      <div className="absolute top-3 right-3">
                        {getStatusBadge(app.status)}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          {/* Quick Apply Section */}
          <div>
            <SectionHeader title="Quick Apply" />
            {matchesLoading ? (
              <InlineLoader message="Loading..." />
            ) : quickApplyJobs.length === 0 ? (
              <p className="text-[14px] text-[#1C1C1C80] text-center py-8">
                No quick apply opportunities available.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {quickApplyJobs.map((company: Company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    buttonText="Apply"
                    onButtonClick={() => handleApplyClick(company.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* === DESKTOP VIEW === */}
        <div className="hidden lg:flex w-full justify-between gap-[46px]">
          {/* Left side: Job Applications */}
          <div className="flex flex-col gap-[20px] md:gap-[30px] w-[878px] h-full overflow-y-auto pr-2">
            {/* Header */}
            <div className="flex flex-col gap-4 sticky top-0 bg-white z-10 pb-4 border-b border-fade">
              <div className="flex items-center justify-between">
                <h1 className="font-semibold text-[24px] text-[#1C1C1C]">
                  Job Applications
                </h1>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-[10px] transition-all ${
                    showFilters || statusFilter !== 'all'
                      ? 'border-button bg-button/5 text-button'
                      : 'border-fade bg-white text-[#1C1C1C] hover:border-button/50'
                  }`}
                >
                  <BsFilter className="text-[16px]" />
                  <span className="text-[14px] font-medium">Filters</span>
                </button>
              </div>

              {/* Search */}
              <div className="flex gap-2.5 items-center text-fade px-4 py-2.5 border border-fade rounded-[10px] bg-white focus-within:border-button focus-within:ring-2 focus-within:ring-button/20 transition-all">
                <BsSearch className="text-[16px] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full placeholder:text-fade text-[#1c1c1c] outline-none bg-transparent"
                  placeholder="Search applications..."
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-fade hover:text-[#1C1C1C]"
                  >
                    <HiOutlineX className="text-[16px]" />
                  </button>
                )}
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-[#F8F8F8] rounded-[12px] border border-fade">
                  <span className="text-[14px] font-medium text-[#1C1C1C80]">
                    Status:
                  </span>
                  {statusTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => setStatusFilter(type)}
                      className={`px-4 py-2 rounded-[20px] text-[14px] font-medium transition-all capitalize ${
                        statusFilter === type
                          ? 'bg-button text-white shadow-sm'
                          : 'bg-white text-[#1C1C1C] border border-fade hover:border-button/50'
                      }`}
                    >
                      {type === 'all' ? 'All Status' : type}
                    </button>
                  ))}
                </div>
              )}

              {/* Count */}
              <p className="text-[14px] text-[#1C1C1C80]">
                {filteredApplications.length}{' '}
                {filteredApplications.length === 1
                  ? 'application'
                  : 'applications'}
              </p>
            </div>

            {/* Applications List */}
            {applicationsLoading ? (
              <div className="flex items-center justify-center py-16">
                <InlineLoader message="Loading applications..." />
              </div>
            ) : applicationsError ? (
              <ErrorState
                title="Failed to load applications"
                message={
                  (applicationsError as any)?.response?.data?.message ||
                  'Please try again later.'
                }
                variant="fullPage"
              />
            ) : filteredApplications.length === 0 ? (
              <EmptyState
                icon={
                  <div className="w-20 h-20 rounded-full bg-fade flex items-center justify-center mb-4">
                    <MdPending className="text-[32px] text-[#1C1C1C40]" />
                  </div>
                }
                title="No applications found"
                description={
                  applications.length === 0
                    ? "You haven't applied to any jobs yet."
                    : 'Try adjusting your filters.'
                }
                variant="minimal"
              />
            ) : (
              <div className="flex flex-col gap-4">
                {filteredApplications.map(
                  (app: Company & { status?: string }) => (
                    <div key={app.id} className="relative">
                      <CompanyFlatCard
                        company={app}
                        buttonText="Preview"
                        onPreviewClick={handlePreviewClick}
                      />
                      {app.status && (
                        <div className="absolute top-4 right-4">
                          {getStatusBadge(app.status)}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Divider line */}
          <div className="h-full w-px bg-linear-to-b from-transparent via-fade to-transparent" />

          {/* Right side: Quick Apply */}
          <div className="flex flex-col gap-[20px] md:gap-[30px] h-full overflow-y-auto pr-2">
            <div className="sticky top-0 bg-white z-10 pb-4 border-b border-fade">
              <h2 className="font-semibold text-[24px] text-[#1C1C1C] mb-2">
                Quick Apply
              </h2>
              <p className="text-[14px] text-[#1C1C1C80]">
                High-match opportunities you can apply to quickly
              </p>
            </div>
            {matchesLoading ? (
              <div className="flex items-center justify-center py-16">
                <InlineLoader message="Loading..." />
              </div>
            ) : quickApplyJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-[14px] text-[#1C1C1C80] text-center">
                  No quick apply opportunities available.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {quickApplyJobs.map((company: Company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    buttonText="Apply"
                    onButtonClick={() => handleApplyClick(company.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CompanyPreviewModal
        isOpen={isModalOpen}
        company={selectedCompany}
        onClose={handleCloseModal}
        onChat={() => {}}
        onApply={() => {}}
      />
    </>
  );
};

export default GraduateApplications;
