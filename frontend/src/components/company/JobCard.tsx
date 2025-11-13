import { CiMail } from 'react-icons/ci';
import { HiOutlineBriefcase } from 'react-icons/hi';
import { CompanyJob } from '../../data/jobs';

interface JobCardProps {
  job: CompanyJob;
  onViewMatches?: (job: CompanyJob) => void;
}

const statusStyles: Record<CompanyJob['status'], string> = {
  active: 'bg-[#EAF4E2] text-[#1B7700]',
  paused: 'bg-[#FFF5E0] text-[#8A6A05]',
  closed: 'bg-[#F5E6FF] text-[#5D1B77]',
};

const JobCard: React.FC<JobCardProps> = ({ job, onViewMatches }) => {
  const handleClick = () => {
    onViewMatches?.(job);
  };

  return (
    <article className="flex max-w-[560px] flex-col gap-[18px] rounded-[20px] border border-[#1B77001A] bg-white p-[18px] shadow-[0_18px_40px_-24px_rgba(47,81,43,0.12)]">
      <div className="relative h-[220px] w-full overflow-hidden rounded-[16px]">
        <img
          src={job.image}
          alt={job.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute left-[14px] top-[14px] flex h-[44px] w-[44px] items-center justify-center rounded-full border border-white/40 bg-white/30 backdrop-blur-sm text-white text-[22px]">
          <HiOutlineBriefcase />
        </div>
      </div>

      <div className="flex items-start justify-between gap-[16px]">
        <div className="flex flex-col gap-[6px]">
          <h3 className="text-[22px] font-semibold text-[#1C1C1C]">
            {job.title}
          </h3>
          <p className="text-[14px] font-medium text-[#1C1C1CBF]">
            {job.location}
          </p>
          <p className="max-w-[420px] text-[14px] text-[#1C1C1CBF]">
            {job.description}
          </p>
        </div>

        <div
          className={`shrink-0 rounded-full px-[16px] py-[8px] text-[13px] font-medium ${statusStyles[job.status]}`}
        >
          Active
        </div>
      </div>

      <div className="flex flex-wrap gap-[20px] text-[14px] text-[#1C1C1CBF]">
        <div className="flex min-w-[120px] flex-col gap-[4px]">
          <span className="font-semibold text-[#1C1C1CE5]">{job.duration}</span>
          <span>Contract</span>
        </div>
        <span className="hidden h-[32px] w-px bg-[#1C1C1C1A] sm:block" />
        <div className="flex min-w-[120px] flex-col gap-[4px]">
          <span className="font-semibold text-[#1C1C1CE5]">
            {job.salaryRange}
          </span>
          <span>{job.salaryType}</span>
        </div>
        <span className="hidden h-[32px] w-px bg-[#1C1C1C1A] sm:block" />
        <div className="flex min-w-[120px] flex-col gap-[4px]">
          <span className="font-semibold text-[#1C1C1CE5]">
            {job.matchedCount}
          </span>
          <span>Matched</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleClick}
        className="mt-auto flex h-[55px] items-center justify-center gap-[10px] rounded-[12px] bg-button text-[16px] font-medium text-[#F8F8F8] transition hover:bg-[#176300]"
      >
        <CiMail className="text-[22px]" />
        View matched candidates
      </button>
    </article>
  );
};

export default JobCard;

