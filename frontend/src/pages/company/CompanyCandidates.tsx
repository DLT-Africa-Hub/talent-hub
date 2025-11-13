import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFilter, FiSearch } from 'react-icons/fi';
import CandidateCard from '../../components/company/CandidateCard';
import {
  CandidateProfile,
  CandidateStatus,
  companyCandidates,
} from '../../data/candidates';

const statusFilters: { label: string; value: CandidateStatus }[] = [
  { label: 'Applied', value: 'applied' },
  { label: 'Matched', value: 'matched' },
  { label: 'Hired', value: 'hired' },
  { label: 'Pending', value: 'pending' },
];

const CompanyCandidates = () => {
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] = useState<CandidateStatus>('applied');

  const filteredCandidates = useMemo(() => {
    return companyCandidates.filter(
      (candidate) => candidate.status === activeStatus
    );
  }, [activeStatus]);

  const handlePreview = (candidate: CandidateProfile) => {
    navigate(`/candidate-preview/${candidate.id}`);
  };

  return (
    <section className="flex flex-col gap-[32px] px-[20px] py-[24px] pb-[120px] font-inter lg:px-0 lg:pr-[24px]">
      <div className="flex flex-col gap-[16px]">
        <div className="flex w-full flex-col items-stretch gap-[12px] lg:items-end">
          <div className="flex w-full justify-start lg:w-auto lg:justify-end">
            <div className="relative flex h-[60px] w-full max-w-[360px] items-center rounded-[14px] border border-fade bg-white px-[20px]">
              <FiSearch className="text-[22px] text-[#1C1C1C80]" />
              <input
                type="text"
                placeholder="Search candidates"
                className="h-full w-full border-0 bg-transparent pl-[12px] text-[16px] text-[#1C1C1C] placeholder:text-[#1C1C1C66] focus:outline-none"
              />
              <button
                type="button"
                className="ml-[12px] flex h-[40px] w-[40px] items-center justify-center rounded-full border border-fade bg-[#F8F8F8]"
              >
                <FiFilter className="text-[18px] text-[#1C1C1C]" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap justify-start gap-[12px] lg:justify-end">
            {statusFilters.map((filter) => {
              const isActive = filter.value === activeStatus;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveStatus(filter.value)}
                  className={`flex items-center gap-[10px] rounded-full px-[20px] py-[12px] text-[14px] font-medium transition ${
                    isActive
                      ? 'border border-fade bg-[#DBFFC0] text-[#1C1C1C]'
                      : 'border border-transparent bg-[#F0F0F0] text-[#1C1C1C80]'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[24px] sm:grid-cols-2 xl:grid-cols-4">
        {filteredCandidates.length > 0 ? (
          filteredCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onPreview={handlePreview}
            />
          ))
        ) : (
          <div className="col-span-full flex h-[240px] flex-col items-center justify-center rounded-[20px] border border-fade bg-white text-center text-[#1C1C1C80]">
            <p className="text-[18px] font-medium text-[#1C1C1CE5]">
              No candidates in this stage yet
            </p>
            <p className="text-[14px] text-[#1C1C1C80]">
              Try adjusting your filters to discover more talents.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CompanyCandidates;