import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

const CompanyJobForm = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/jobs');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('Submit new job');
  };

  return (
    <section className="flex flex-col gap-[24px] px-[20px] py-[24px] pb-[120px] font-inter lg:px-0 lg:pr-[24px]">
      <button
        type="button"
        onClick={handleBack}
        className="flex w-fit items-center gap-[8px] rounded-[10px] border border-fade bg-[#F8F8F8] px-[16px] py-[10px] text-[14px] font-medium text-[#1C1C1C80] transition hover:text-[#1C1C1C]"
      >
        <FiArrowLeft className="text-[18px]" />
        Back to jobs
      </button>

      <div className="flex flex-col items-center gap-[16px] text-center text-[#1C1C1C]">
        <h1 className="text-[32px] font-semibold">Post a Job</h1>
        <p className="max-w-[520px] text-[16px] text-[#1C1C1C80]">
          Create a job listing to attract top talent
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-[720px] flex-col gap-[20px] rounded-[20px] border border-[#1B77001A] bg-white p-[28px] shadow-[0_18px_40px_-24px_rgba(47,81,43,0.12)]"
      >
        <div className="flex flex-col gap-[8px] text-left">
          <label className="text-[16px] font-medium text-[#1C1C1C]">
            Job title
          </label>
          <input
            type="text"
            placeholder="e.g Frontend developer"
            className="h-[60px] rounded-[14px] border border-[#D9E6C9] bg-[#F8F8F8] px-[18px] text-[16px] text-[#1C1C1C] placeholder:text-[#1C1C1C66] focus:border-button focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-[20px] sm:grid-cols-2">
          <div className="flex flex-col gap-[8px]">
            <label className="text-[16px] font-medium text-[#1C1C1C]">
              Job type
            </label>
            <select className="h-[60px] rounded-[14px] border border-[#D9E6C9] bg-[#F8F8F8] px-[18px] text-[16px] text-[#1C1C1C] focus:border-button focus:outline-none">
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
            </select>
          </div>
          <div className="flex flex-col gap-[8px]">
            <label className="text-[16px] font-medium text-[#1C1C1C]">
              Salary range
            </label>
            <select className="h-[60px] rounded-[14px] border border-[#D9E6C9] bg-[#F8F8F8] px-[18px] text-[16px] text-[#1C1C1C] focus:border-button focus:outline-none">
              <option>$80k-90k</option>
              <option>$90k-110k</option>
              <option>$110k-140k</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-[20px] sm:grid-cols-2">
          <div className="flex flex-col gap-[8px]">
            <label className="text-[16px] font-medium text-[#1C1C1C]">
              Location
            </label>
            <select className="h-[60px] rounded-[14px] border border-[#D9E6C9] bg-[#F8F8F8] px-[18px] text-[16px] text-[#1C1C1C] focus:border-button focus:outline-none">
              <option>United States</option>
              <option>Canada</option>
              <option>Remote (Global)</option>
            </select>
          </div>

          <div className="flex flex-col gap-[8px]">
            <label className="text-[16px] font-medium text-[#1C1C1C]">
              Required skillset
            </label>
            <select className="h-[60px] rounded-[14px] border border-[#D9E6C9] bg-[#F8F8F8] px-[18px] text-[16px] text-[#1C1C1C] focus:border-button focus:outline-none">
              <option>React, TypeScript</option>
              <option>Node.js, Express</option>
              <option>UI/UX, Figma</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-[8px]">
          <label className="text-[16px] font-medium text-[#1C1C1C]">
            Job Description
          </label>
          <textarea
            rows={5}
            placeholder="Describe the role"
            className="rounded-[14px] border border-[#D9E6C9] bg-[#F8F8F8] px-[18px] py-[16px] text-[16px] text-[#1C1C1C] placeholder:text-[#1C1C1C66] focus:border-button focus:outline-none"
          />
        </div>

        <div className="mt-[12px] flex justify-center">
          <button
            type="submit"
            className="flex h-[55px] w-full max-w-[400px] items-center justify-center rounded-[14px] bg-button text-[18px] font-semibold text-[#F8F8F8] transition hover:bg-[#176300]"
          >
            Post Job
          </button>
        </div>
      </form>
    </section>
  );
};

export default CompanyJobForm;

