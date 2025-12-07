import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchIcon, X } from 'lucide-react';
import { IoFilterOutline } from 'react-icons/io5';
import GraduateCard from '../../components/admin/graduates/graduate-card';
import GraduateModal from '../../components/admin/graduates/graduate-modal';
import { adminApi } from '../../api/admin';
import { LoadingSpinner, EmptyState } from '../../components/ui';
import { DEFAULT_PROFILE_IMAGE } from '../../utils/job.utils';

export interface Graduate {
  id: string;
  name: string;
  position: string;
  rank?: string;
  expLevel: string;
  skills: string[];
  profilePictureUrl?: string;
  location?: string;
  salaryPerAnnum?: number;
}

type Filters = {
  rank: string;
  position: string;
  location: string;
};

const Graduates: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>({
    rank: '',
    position: '',
    location: '',
  });
  const [selectedGraduateId, setSelectedGraduateId] = useState<string | null>(
    null
  );

  // Tell useQuery what type it returns: Graduate[]
  const {
    data: graduatesData,
    isLoading,
    error,
  } = useQuery<Graduate[], Error>({
    queryKey: ['adminGraduates', searchQuery, filters],
    queryFn: async () => {
      const params: any = {
        page: 1,
        limit: 100,
        ...(searchQuery && { q: searchQuery }),
        ...(filters.rank && { rank: filters.rank }),
        ...(filters.position && { position: filters.position }),
        ...(filters.location && { location: filters.location }),
      };

      const response = await adminApi.getAllGraduates(params);

      // map response into Graduate[] — make sure it always returns an array
      const mapped: Graduate[] = (response?.data || []).map((grad: any) => ({
        id: grad._id ?? grad.id ?? '',
        name:
          grad.name ?? `${grad.firstName ?? ''} ${grad.lastName ?? ''}`.trim(),
        position: grad.position ?? '',
        rank: grad.rank,
        expLevel: grad.expLevel ?? '',
        skills: grad.skills ?? [],
        profilePictureUrl: grad.profilePictureUrl ?? DEFAULT_PROFILE_IMAGE,
        location: grad.location ?? '',
        salaryPerAnnum: grad.salaryPerAnnum,
      }));

      return mapped;
    },
    placeholderData: (previousData) => previousData,
  });

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      rank: '',
      position: '',
      location: '',
    });
    setSearchQuery('');
  };

  const hasActiveFilters = Boolean(
    filters.rank || filters.position || filters.location || searchQuery
  );
  const activeFilterCount = [
    filters.rank,
    filters.position,
    filters.location,
    searchQuery,
  ].filter(Boolean).length;

  return (
    <div className="py-[20px] px-[20px] lg:px-0 lg:pr-[20px] flex flex-col gap-[43px] font-inter items-start overflow-y-auto h-full">
      {/* Header */}
      <div className="flex flex-col gap-2.5">
        <p className="text-[#1C1C1C] font-semibold text-[26px]">Graduates</p>
        <p className="text-[#1C1C1CBF] font-medium text-[18px]">
          Manage all registered graduates
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-[18px] w-full">
        {/* Search Bar and Filter Toggle */}
        <div className="flex gap-[20px] w-full">
          {/* Search Input */}
          <div className="flex items-center border w-full border-fade rounded-[10px]">
            <p className="text-fade p-[15px]">
              <SearchIcon />
            </p>
            <div className="w-px h-[20px] bg-fade" />
            <input
              type="text"
              placeholder="Search by name, rank, position, or location"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full outline-none text-[16px] p-[15px] placeholder:text-fade"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-fade hover:text-gray-600 p-[15px]"
                aria-label="Clear search"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Filters Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-[20px] py-[15px] border rounded-[10px] cursor-pointer transition-colors border-fade text-fade"
            aria-pressed={showFilters}
          >
            <span className="text-[20px]">
              <IoFilterOutline />
            </span>
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                {String(activeFilterCount)}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-col gap-4 p-4 border border-fade rounded-[10px] bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Rank Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#1C1C1C]">
                  Rank
                </label>
                <select
                  value={filters.rank}
                  onChange={(e) => handleFilterChange('rank', e.target.value)}
                  className="border border-fade p-3 rounded-[10px] outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">All Ranks</option>
                  <option value="entry level">Entry Level</option>
                  <option value="mid level">Mid Level</option>
                  <option value="senior level">Senior Level</option>
                </select>
              </div>

              {/* Position Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#1C1C1C]">
                  Position
                </label>
                <select
                  value={filters.position}
                  onChange={(e) =>
                    handleFilterChange('position', e.target.value)
                  }
                  className="border border-fade p-3 rounded-[10px] outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">All Positions</option>
                  <option value="frontend developer">Frontend Developer</option>
                  <option value="backend developer">Backend Developer</option>
                  <option value="fullstack developer">
                    Fullstack Developer
                  </option>
                  <option value="mobile developer">Mobile Developer</option>
                  <option value="devops engineer">DevOps Engineer</option>
                  <option value="data engineer">Data Engineer</option>
                  <option value="security engineer">Security Engineer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Location Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#1C1C1C]">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="Enter location"
                  value={filters.location}
                  onChange={(e) =>
                    handleFilterChange('location', e.target.value)
                  }
                  className="border border-fade p-3 rounded-[10px] outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div className="flex justify-end">
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results Count */}
        {!isLoading && graduatesData && (
          <div className="text-sm text-[#1C1C1CBF]">
            Found {graduatesData.length} graduate
            {graduatesData.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Graduate Cards */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20 w-full">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <EmptyState
          title="Failed to load graduates"
          description="Please try again later"
        />
      ) : !graduatesData || graduatesData.length === 0 ? (
        <EmptyState
          title="No graduates found"
          description={
            hasActiveFilters
              ? 'Try adjusting your filters or search terms'
              : 'No graduates have registered yet'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[20px] w-full">
          {graduatesData.map((grad) => (
            <GraduateCard
              key={grad.id}
              {...grad}
              onClick={() => setSelectedGraduateId(grad.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedGraduateId && (
        <GraduateModal
          graduateId={selectedGraduateId}
          onClose={() => setSelectedGraduateId(null)}
        />
      )}
    </div>
  );
};

export default Graduates;
