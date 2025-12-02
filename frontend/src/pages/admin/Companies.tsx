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
import { ApiUser } from '../../types/api';

type CompanyRow = {
  id: string;
  name: string;
  jobs: number;
  candidates: number;
  status: 'Active' | 'Pending' | 'Suspended';
  joined: string; // ISO date
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

  // Fetch companies from API
  const {
    data: companiesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['adminCompanies', searchQuery],
    queryFn: async () => {
      const response = await adminApi.getAllUsers({
        role: 'company',
        page: 1,
        limit: 100,
        ...(searchQuery && { q: searchQuery }),
      });
      // Transform user data to company row format
      // Note: This is a simplified transformation. You may need to fetch
      // additional company profile data to get jobs/candidates counts
      return (response.data || []).map((user: ApiUser) => ({
        id: user.id,
        name: user.email.split('@')[0], // Fallback to email prefix
        jobs: 0, // TODO: Fetch from company profile
        candidates: 0, // TODO: Fetch from company profile
        status: user.emailVerified ? 'Active' : 'Pending' as CompanyRow['status'],
        joined: user.createdAt,
      }));
    },
  });

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
          </div>
        </div>
      ),
      sortable: false,
    },
    { header: 'Job Posted', accessor: 'jobs', sortable: true, align: 'left' },
    {
      header: 'Candidate',
      accessor: 'candidates',
      sortable: true,
      align: 'left',
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (v: CompanyRow['status']) => <StatusBadge status={v} />,
      sortable: true,
      align: 'left',
    },
    {
      header: 'Join Date',
      accessor: 'joined',
      render: (v: string) => (
        <span className="text-sm text-gray-600">
          {new Date(v).toLocaleDateString()}
        </span>
      ),
      sortable: true,
      align: 'left',
    },
  ];
  return (
    <div className="py-[20px] px-[20px]  lg:px-0 lg:pr-[20px] flex flex-col gap-[43px] font-inter items-start overflow-y-auto h-full">
      <div className="flex flex-col gap-2.5">
        <p className="text-[#1C1C1C] font-semibold text-[26px]">Companies</p>
        <p className="text-[#1C1C1CBF] font-medium text-[18px]">
          Manage all registered companies
        </p>
      </div>

      <div className="flex flex-col gap-[18px] w-full">
        <div className="flex gap-[20px] w-full">
          <div className="flex items-center border w-full border-fade rounded-[10px]">
            <p className="text-fade  p-[15px]">
              <SearchIcon />
            </p>
            <div className="w-px h-[20px] bg-fade" />
            <input
              type="text"
              placeholder="Search companies"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full outline-none  text-[16px] p-[15px] placeholder:text-fade"
            />
          </div>
          <div className="text-fade text-[20px] px-[20px] py-[15px] border border-fade rounded-[10px] cursor-pointer">
            <IoFilterOutline />
          </div>
        </div>

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
            description="No companies have registered yet"
          />
        ) : (
          <Table
            data={companiesData}
            columns={columns}
            rowKey="id"
            pageSize={10}
            selectable={false}
            actions={(row) => (
              <div className="flex items-center justify-end">
                <button
                  aria-label={`actions-${row.id}`}
                  className="w-10 h-10 rounded-lg border text-fade text-[20px] border-fade flex items-center justify-center hover:bg-green-50"
                >
                  <PiDotsThreeOutlineVertical />
                </button>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
};

export default Companies;
