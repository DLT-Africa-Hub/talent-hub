import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PiBuildingApartmentLight,
  PiMapPinLight,
  PiUsersThreeLight,
  PiBriefcaseLight,
  PiGlobeLight,
  PiX,
} from 'react-icons/pi';
import { FaRegCirclePause, FaRegClock } from 'react-icons/fa6';

import { LoadingSpinner, EmptyState } from '@/components/ui';

import { FaRegCheckCircle } from 'react-icons/fa';
import adminApi from '@/api/admin';
import Table, { Column } from '@/components/ui/Table';

type JobRow = {
  id: string;
  title: string;
  status: string;
  location: string;
  salary: any;
  createdAt: string;
};

type ApplicationRow = {
  id: string;
  jobTitle: string;
  candidateName: string;
  status: string;
  appliedAt: string;
  updatedAt: string;
};

type CompanyDetailsModalProps = {
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
};

function StatusBadge({
  status,
}: {
  status: 'Active' | 'Pending' | 'Suspended';
}) {
  const base =
    'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ring-1 ring-inset';
  if (status === 'Active')
    return (
      <span className={`${base} text-green-700 bg-green-50 ring-green-200`}>
        <FaRegCheckCircle /> Active
      </span>
    );
  if (status === 'Pending')
    return (
      <span className={`${base} text-orange-700 bg-orange-50 ring-orange-200`}>
        <FaRegClock /> Pending
      </span>
    );
  return (
    <span className={`${base} text-red-700 bg-red-50 ring-red-200`}>
      <FaRegCirclePause /> Suspended
    </span>
  );
}

const CompanyDetailsModal = ({
  companyId,
  isOpen,
  onClose,
}: CompanyDetailsModalProps) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'jobs' | 'applications'
  >('overview');

  // Fetch company details
  const { data, isLoading, error } = useQuery({
    queryKey: ['companyDetails', companyId],
    queryFn: async () => {
      return await adminApi.getCompanyDetails(companyId);
    },
    enabled: isOpen && !!companyId,
  });

  // Toggle company status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (active: boolean) => {
      return await adminApi.toggleCompanyStatus(companyId, active);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['companyDetails', companyId],
      });
      queryClient.invalidateQueries({ queryKey: ['adminCompanies'] });
    },
  });

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const jobColumns: Column<JobRow>[] = [
    {
      header: 'Job Title',
      accessor: 'title',
      sortable: true,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (v: unknown) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            v === 'active'
              ? 'bg-green-100 text-green-800'
              : v === 'closed'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {String(v).toUpperCase()}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Location',
      accessor: 'location',
      sortable: true,
    },
    {
      header: 'Posted',
      accessor: 'createdAt',
      render: (v: unknown) => new Date(v as string).toLocaleDateString(),
      sortable: true,
    },
  ];

  const applicationColumns: Column<ApplicationRow>[] = [
    {
      header: 'Candidate',
      accessor: 'candidateName',
      sortable: true,
    },
    {
      header: 'Job Title',
      accessor: 'jobTitle',
      sortable: true,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (v: unknown) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            v === 'accepted'
              ? 'bg-green-100 text-green-800'
              : v === 'rejected'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {String(v).toUpperCase()}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Applied',
      accessor: 'appliedAt',
      render: (v: unknown) => new Date(v as string).toLocaleDateString(),
      sortable: true,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 bg-opacity-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex justify-center items-center p-20">
            <LoadingSpinner />
          </div>
        ) : error || !data?.data ? (
          <div className="p-12">
            <EmptyState
              title="Company not found"
              description="The company you're looking for doesn't exist or has been removed"
            />
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#DBFFC0] text-2xl flex items-center justify-center ring-1 ring-green-100">
                  <PiBuildingApartmentLight />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {data.data.company.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Joined{' '}
                    {new Date(data.data.company.joined).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex flex-col-reverse lg:flex-row items-center gap-3">
                <div className="flex items-center gap-3">
                  <StatusBadge status={data.data.company.status} />
                  {data.data.company.status === 'Active' ? (
                    <button
                      onClick={() => toggleStatusMutation.mutate(false)}
                      disabled={toggleStatusMutation.isPending}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {toggleStatusMutation.isPending
                        ? 'Processing...'
                        : 'Suspend'}
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleStatusMutation.mutate(true)}
                      disabled={toggleStatusMutation.isPending}
                      className="px-3 py-1.5  bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {toggleStatusMutation.isPending
                        ? 'Processing...'
                        : 'Activate'}
                    </button>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 self-end lg:self-auto hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <PiX className="text-xl text-gray-500" />
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50">
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <PiBriefcaseLight className="text-lg text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold">
                      {data.data.stats.totalJobs}
                    </p>
                    <p className="text-xs text-gray-500">Total Jobs</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <FaRegCheckCircle className="text-lg text-green-600" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold">
                      {data.data.stats.activeJobs}
                    </p>
                    <p className="text-xs text-gray-500">Active Jobs</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <PiUsersThreeLight className="text-lg text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold">
                      {data.data.stats.totalApplications}
                    </p>
                    <p className="text-xs text-gray-500">Applications</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <FaRegClock className="text-lg text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold">
                      {data.data.stats.pendingApplications}
                    </p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 px-6">
              <div className="flex gap-6">
                {['overview', 'jobs', 'applications'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as typeof activeTab)}
                    className={`pb-3 px-1 text-sm font-medium capitalize ${
                      activeTab === tab
                        ? 'text-green-600 border-b-2 border-green-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'overview' && (
                <div className="flex flex-col gap-6 md:grid md:grid-cols-2">
                  {/* Company Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-base font-semibold mb-3">
                      Company Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <PiBuildingApartmentLight className="text-lg text-gray-400 mt-1" />
                        <div>
                          <p className="text-xs text-gray-500">Industry</p>
                          <p className="text-sm font-medium">
                            {data.data.company.industry}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <PiUsersThreeLight className="text-lg text-gray-400 mt-1" />
                        <div>
                          <p className="text-xs text-gray-500">Company Size</p>
                          <p className="text-sm font-medium">
                            {data.data.company.size.toLocaleString()} employees
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <PiMapPinLight className="text-lg text-gray-400 mt-1" />
                        <div>
                          <p className="text-xs text-gray-500">Location</p>
                          <p className="text-sm font-medium">
                            {data.data.company.location || 'Not specified'}
                          </p>
                        </div>
                      </div>
                      {data.data.company.website && (
                        <div className="flex items-start gap-3">
                          <PiGlobeLight className="text-lg text-gray-400 mt-1" />
                          <div>
                            <p className="text-xs text-gray-500">Website</p>
                            <a
                              href={data.data.company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-blue-600 hover:underline"
                            >
                              {data.data.company.website}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-base font-semibold mb-3">
                      Account Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-medium">
                          {data.data.user.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Email Verified</p>
                        <p className="text-sm font-medium">
                          {data.data.user.emailVerified ? 'Yes' : 'No'}
                        </p>
                      </div>
                      {data.data.user.lastLogin && (
                        <div>
                          <p className="text-xs text-gray-500">Last Login</p>
                          <p className="text-sm font-medium">
                            {new Date(
                              data.data.user.lastLogin
                            ).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bg-gray-50 p-4 rounded-lg col-span-2">
                    <h3 className="text-base font-semibold mb-3">
                      Company Description
                    </h3>
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {data.data.company.description}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'jobs' && (
                <div>
                  {data.data.jobs.length === 0 ? (
                    <div className="py-12">
                      <EmptyState
                        title="No jobs posted"
                        description="This company hasn't posted any jobs yet"
                      />
                    </div>
                  ) : (
                    <Table
                      data={data.data.jobs}
                      columns={jobColumns}
                      rowKey="id"
                      pageSize={5}
                      selectable={false}
                    />
                  )}
                </div>
              )}

              {activeTab === 'applications' && (
                <div>
                  {data.data.applications.length === 0 ? (
                    <div className="py-12">
                      <EmptyState
                        title="No applications"
                        description="No candidates have applied to this company's jobs yet"
                      />
                    </div>
                  ) : (
                    <Table
                      data={data.data.applications}
                      columns={applicationColumns}
                      rowKey="id"
                      pageSize={5}
                      selectable={false}
                    />
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CompanyDetailsModal;
