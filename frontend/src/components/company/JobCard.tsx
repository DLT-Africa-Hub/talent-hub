import React from 'react';
import { CiMail } from 'react-icons/ci';
import { HiOutlineBriefcase, HiOutlineLocationMarker } from 'react-icons/hi';
import { CompanyJob } from '../../data/jobs';
import { jobStatusStyles, jobStatusLabels } from '../../utils/job.utils';

interface JobCardProps {
  job: CompanyJob & {
    skills?: string[];
    preferedRank?: string;
    createdAt?: string | Date;
  };
  onViewMatches?: (job: CompanyJob) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onViewMatches }) => {
  const handleClick = () => {
    onViewMatches?.(job);
  };

  // Truncate description to 120 characters
  const truncatedDescription =
    job.description && job.description.length > 120
      ? `${job.description.substring(0, 120)}...`
      : job.description || 'No description provided.';

  // Format date if available
  const formatDate = (date?: string | Date): string => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();

    // Reset time to midnight for day comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const jobDate = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate()
    );

    // Calculate difference in days
    const diffTime = today.getTime() - jobDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <article className="group flex max-w-[560px] flex-col gap-[18px] rounded-[20px] border border-fade bg-white p-[18px] shadow-[0_18px_40px_-24px_rgba(47,81,43,0.12)] transition-all hover:shadow-[0_24px_48px_-24px_rgba(47,81,43,0.18)] hover:border-button/20">
      {/* Image Section */}
      <div className="relative h-[200px] w-full overflow-hidden rounded-[16px] bg-gradient-to-br from-button/10 to-button/5">
        <img
          src={job.image}
          alt={job.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            // Fallback to a gradient if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
        <div className="absolute left-[14px] top-[14px] flex h-[44px] w-[44px] items-center justify-center rounded-full border border-white/40 bg-white/30 backdrop-blur-sm text-button text-[22px] shadow-lg">
          <HiOutlineBriefcase />
        </div>
        {job.preferedRank && (
          <div className="absolute right-[14px] top-[14px] rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 text-[12px] font-semibold text-button shadow-md">
            Rank: {job.preferedRank}
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-[16px]">
        <div className="flex flex-1 flex-col gap-[6px]">
          <h3 className="text-[22px] font-semibold text-[#1C1C1C] leading-tight">
            {job.title}
          </h3>
          <div className="flex items-center gap-2 text-[14px] font-medium text-[#1C1C1CBF]">
            <HiOutlineLocationMarker className="text-[16px]" />
            <span>{job.location}</span>
          </div>
          <p className="text-[14px] leading-relaxed text-[#1C1C1CBF] line-clamp-2">
            {truncatedDescription}
          </p>
        </div>

        <div
          className={`shrink-0 rounded-full px-[14px] py-[6px] text-[12px] font-semibold capitalize ${jobStatusStyles[job.status]}`}
        >
          {jobStatusLabels[job.status]}
        </div>
      </div>

      {job.skills && job.skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {job.skills.slice(0, 4).map((skill, index) => (
            <span
              key={index}
              className="rounded-lg bg-[#F8F8F8] px-3 py-1 text-[12px] font-medium text-[#1C1C1CBF] border border-fade"
            >
              {skill}
            </span>
          ))}
          {job.skills.length > 4 && (
            <span className="rounded-lg bg-[#F8F8F8] px-3 py-1 text-[12px] font-medium text-[#1C1C1CBF] border border-fade">
              +{job.skills.length - 4} more
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-[20px] text-[14px] text-[#1C1C1CBF] w-full justify-center text-center">
        <div className="flex flex-col gap-[4px]">
          <span className="font-semibold text-[#1C1C1C]">{job.duration}</span>
          <span className="text-[13px]">Job Type</span>
        </div>
        <span className="hidden h-[32px] w-px bg-fade sm:block" />
        <div className="flex min-w-[100px] flex-col gap-[4px]">
          <span className="font-semibold text-[#1C1C1C]">
            {job.salaryRange === 'Not specified' ? '—' : job.salaryRange}
          </span>
          <span className="text-[13px]">{job.salaryType}</span>
        </div>
        <span className="hidden h-[32px] w-px bg-fade sm:block" />
        <div className="flex min-w-[100px] flex-col gap-[4px]">
          <span className="font-semibold text-[#1C1C1C]">
            {job.matchedCount || 0}
          </span>
          <span className="text-[13px]">
            {job.matchedCount === 1 ? 'Match' : 'Matches'}
          </span>
        </div>
      </div>

      {/* Footer Section */}
      <div className="w-full">
        <button
          type="button"
          onClick={handleClick}
          disabled={!onViewMatches}
          className="w-full flex h-[48px] items-center justify-center gap-[10px] rounded-[12px] bg-button text-[15px] font-medium text-white transition-all hover:bg-[#176300] disabled:opacity-50 disabled:cursor-not-allowed "
        >
          <CiMail className="text-[20px]" />
          View Matches
        </button>
      </div>
    </article>
  );
};

export default JobCard;
