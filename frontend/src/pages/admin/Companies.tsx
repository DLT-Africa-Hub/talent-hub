import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchIcon } from 'lucide-react';
import { IoFilterOutline } from 'react-icons/io5';
import Table, { Column } from '../../components/ui/Table';
import {
  PiBuildingApartmentLight,
  PiDotsThreeOutlineVertical,
} from 'react-icons/pi';
import { FaRegCheckCircle } from 'react-icons/fa';
import { FaRegCirclePause, FaRegClock } from 'react-icons/fa6';
import { adminApi } from '../../api/admin';
import { LoadingSpinner, EmptyState } from '../../components/ui';
import CompanyDetailsModal from '@/components/admin/company/company-modal';


type CompanyRow = {
  id: string;
  name: string;
  industry: string;
  size: number;
  location: string;
  jobs: number;
  candidates: number;
  status: 'Active' | 'Pending' | 'Suspended';
  joined: string; // ISO date
  userId?: string;
};

type FilterState = {
  industry: string;
  minSize: string;
  maxSize: string;
  location: string;
};

function StatusBadge({ status }: { status: CompanyRow['status'] }) {
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

const Companies = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    industry: '',
    minSize: '',
    maxSize: '',
    location: '',
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    industry: '',
    minSize: '',
    maxSize: '',
    location: '',
  });

  // Fetch companies from API
  const {
    data: companiesResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['adminCompanies', searchQuery, appliedFilters],
    queryFn: async () => {
      const params: any = {
        page: 1,
        limit: 100,
      };

      if (searchQuery) params.q = searchQuery;
      if (appliedFilters.industry) params.industry = appliedFilters.industry;
      if (appliedFilters.minSize) params.minSize = parseInt(appliedFilters.minSize);
      if (appliedFilters.maxSize) params.maxSize = parseInt(appliedFilters.maxSize);
      if (appliedFilters.location) params.location = appliedFilters.location;

      return await adminApi.getAllCompanies(params);
    },
  });

  const companiesData = companiesResponse?.data || [];

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      industry: '',
      minSize: '',
      maxSize: '',
      location: '',
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const activeFilterCount = Object.values(appliedFilters).filter(v => v !== '').length;

  const columns: Column<CompanyRow>[] = [
    {
      header: 'Company',
      accessor: (r) => r,
      render: (_v, row) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#DBFFC0] text-[20px] flex items-center justify-center ring-1 ring-green-100">
            <PiBuildingApartmentLight />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">{row.name}</div>
            <div className="text-xs text-gray-500">{row.industry}</div>
          </div>
        </div>
      ),
      sortable: false,
    },
    {
      header: 'Location',
      accessor: 'location',
      render: (v: unknown) => (
        <span className="text-sm text-gray-600">{v as string}</span>
      ),
      sortable: true,
      align: 'left',
    },
    {
      header: 'Size',
      accessor: 'size',
      render: (v: unknown) => (
        <span className="text-sm text-gray-600">{(v as number).toLocaleString()} employees</span>
      ),
      sortable: true,
      align: 'left',
    },
    { header: 'Jobs Posted', accessor: 'jobs', sortable: true, align: 'left' },
    {
      header: 'Candidates',
      accessor: 'candidates',
      sortable: true,
      align: 'left',
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (v: unknown) => (
        <StatusBadge status={v as CompanyRow['status']} />
      ),
      sortable: true,
      align: 'left',
    },
    {
      header: 'Join Date',
      accessor: 'joined',
      render: (v: unknown) => (
        <span className="text-sm text-gray-600">
          {new Date(v as string).toLocaleDateString()}
        </span>
      ),
      sortable: true,
      align: 'left',
    },
  ];

  return (
    <>
      <div className="py-[20px] px-[20px] lg:px-0 lg:pr-[20px] flex flex-col gap-[43px] font-inter items-start overflow-y-auto h-full">
        <div className="flex flex-col gap-2.5">
          <p className="text-[#1C1C1C] font-semibold text-[26px]">Companies</p>
          <p className="text-[#1C1C1CBF] font-medium text-[18px]">
            Manage all registered companies
          </p>
        </div>

        <div className="flex flex-col gap-[18px] w-full">
          {/* Search and Filter Bar */}
          <div className="flex gap-[20px] w-full">
            <div className="flex items-center border w-full border-fade rounded-[10px]">
              <p className="text-fade p-[15px]">
                <SearchIcon />
              </p>
              <div className="w-px h-[20px] bg-fade" />
              <input
                type="text"
                placeholder="Search companies by name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full outline-none text-[16px] p-[15px] placeholder:text-fade"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="relative text-fade text-[20px] px-[20px] py-[15px] border border-fade rounded-[10px] cursor-pointer hover:bg-gray-50"
            >
              <IoFilterOutline />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="border border-fade rounded-[10px] p-5 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Technology"
                    value={filters.industry}
                    onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Size
                  </label>
                  <input
                    type="number"
                    placeholder="Min employees"
                    value={filters.minSize}
                    onChange={(e) => setFilters({ ...filters, minSize: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Size
                  </label>
                  <input
                    type="number"
                    placeholder="Max employees"
                    value={filters.maxSize}
                    onChange={(e) => setFilters({ ...filters, maxSize: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., San Francisco"
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Apply Filters
                </button>
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <EmptyState
              title="Failed to load companies"
              description="Please try again later"
            />
          ) : !companiesData || companiesData.length === 0 ? (
            <EmptyState
              title="No companies found"
              description={
                searchQuery || activeFilterCount > 0
                  ? 'Try adjusting your search or filters'
                  : 'No companies have registered yet'
              }
            />
          ) : (
            <Table
              data={companiesData}
              columns={columns}
              rowKey="id"
              pageSize={10}
              selectable={false}
              actions={(row) => (
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCompanyId(row.id);
                    }}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    View
                  </button>
                  <button
                    aria-label={`actions-${row.id}`}
                    className="w-10 h-10 rounded-lg border text-fade text-[20px] border-fade flex items-center justify-center hover:bg-green-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Open action menu (additional actions)
                    }}
                  >
                    <PiDotsThreeOutlineVertical />
                  </button>
                </div>
              )}
            />
          )}
        </div>
      </div>

      {/* Company Details Modal */}
      {selectedCompanyId && (
        <CompanyDetailsModal
          companyId={selectedCompanyId}
          isOpen={!!selectedCompanyId}
          onClose={() => setSelectedCompanyId(null)}
        />
      )}
    </>
  );
};

export default Companies;