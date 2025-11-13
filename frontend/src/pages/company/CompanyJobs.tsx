import { useNavigate } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import JobCard from '../../components/company/JobCard';
import { CompanyJob, companyJobs } from '../../data/jobs';

const CompanyJobs = () => {
  const navigate = useNavigate();

  const handleNewJob = () => {
    navigate('/jobs/new');
  };

  const handleViewMatches = (job: CompanyJob) => {
    console.log('View matches for job:', job);
  };

  return (
    <section className="flex flex-col gap-[32px] px-[20px] py-[24px] pb-[120px] font-inter lg:px-0 lg:pr-[24px]">
      <div className="flex w-full flex-col gap-[16px] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-[6px] text-[#1C1C1C]">
          <h1 className="text-[28px] font-semibold">Jobs</h1>
          <p className="text-[15px] text-[#1C1C1C80]">
            Review open roles and manage your job postings.
          </p>
        </div>

        <button
          type="button"
          onClick={handleNewJob}
          className="flex w-full items-center justify-center gap-[10px] rounded-[12px] border border-fade bg-[#EAF4E2] px-[22px] py-[14px] text-[16px] font-medium text-button transition hover:border-button hover:bg-[#DBFFC0] lg:w-auto"
        >
          <FiPlus className="text-[20px]" />
          New Job
        </button>
      </div>

      <div className="grid grid-cols-1 gap-[24px] xl:grid-cols-2">
        {companyJobs.map((job) => (
          <JobCard key={job.id} job={job} onViewMatches={handleViewMatches} />
        ))}
      </div>
    </section>
  );
};

export default CompanyJobs;