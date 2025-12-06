import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchIcon } from 'lucide-react';
import { IoFilterOutline } from 'react-icons/io5';
import GraduateCard from '../../components/admin/graduates/graduate-card';
import { adminApi } from '../../api/admin';
import { LoadingSpinner, EmptyState } from '../../components/ui';
import { DEFAULT_PROFILE_IMAGE } from '../../utils/job.utils';
import { ApiUser } from '../../types/api';

export interface Graduate {
  id: string;
  name: string;
  role: string;
  email: string;
  matchScore: number;
  skills: string[];
  avatar: string;
  salaryPerAnnum?: number;
}

const Graduates = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch graduates from API
  const {
    data: graduatesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['adminGraduates', searchQuery],
    queryFn: async () => {
      const response = await adminApi.getAllUsers({
        role: 'graduate',
        page: 1,
        limit: 100,
        ...(searchQuery && { q: searchQuery }),
      });
      // Note: This returns user data. To get full graduate profile data (skills, avatar, etc.),
      // you would need to fetch from the graduate profile endpoint for each user
      // For now, this is a simplified version
      return (response.data || []).map((user: ApiUser) => ({
        id: user.id,
        name: user.email.split('@')[0], // Fallback
        role: 'Graduate', // TODO: Fetch from graduate profile
        email: user.email,
        matchScore: 0, // TODO: Calculate from matches
        skills: [], // TODO: Fetch from graduate profile
        avatar: DEFAULT_PROFILE_IMAGE,
        salaryPerAnnum: undefined, // TODO: Fetch from graduate profile
      }));
    },
  });

  return (
    <div className="py-[20px] px-[20px]  lg:px-0 lg:pr-[20px] flex flex-col gap-[43px] font-inter items-start overflow-y-auto h-full">
      <div className="flex flex-col gap-2.5">
        <p className="text-[#1C1C1C] font-semibold text-[26px]">Graduates</p>
        <p className="text-[#1C1C1CBF] font-medium text-[18px]">
          Manage all registered graduates
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
              placeholder="Search Graduates"
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
            title="Failed to load graduates"
            description="Please try again later"
          />
        ) : !graduatesData || graduatesData.length === 0 ? (
          <EmptyState
            title="No graduates found"
            description="No graduates have registered yet"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[20px]">
            {graduatesData.map((grad: Graduate) => (
              <GraduateCard
                key={grad.id}
                id={grad.id}
                name={grad.name}
                role={grad.role}
                email={grad.email}
                matchScore={grad.matchScore}
                skills={grad.skills}
                avatar={grad.avatar}
                salaryPerAnnum={grad.salaryPerAnnum}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Graduates;
