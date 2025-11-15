import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input, Select, Textarea, Button } from '../../../../components/ui';
import { skills } from '../../../../utils/material.utils';
import { HiChevronDown } from 'react-icons/hi2';

interface JobFormData {
  title: string;
  jobType: 'Full time' | 'Part time' | 'Contract' | 'Internship' | '';
  location: string;
  salaryMin: string;
  salaryMax: string;
  description: string;
  skills: string[]; // Changed to array
}

interface LocationState {
  formData?: JobFormData;
}

const CompanyJobForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    jobType: '',
    location: '',
    salaryMin: '',
    salaryMax: '',
    description: '',
    skills: [],
  });
  const [isSkillsDropdownOpen, setIsSkillsDropdownOpen] = useState(false);
  const skillsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const state = location.state as LocationState | null;
    if (state?.formData) {
      // Handle backward compatibility: if skills is a string, convert to array
      const restoredFormData = { ...state.formData };
      if (typeof restoredFormData.skills === 'string') {
        restoredFormData.skills = (restoredFormData.skills as unknown as string)
          .split(',')
          .map((skill: string) => skill.trim())
          .filter((skill: string) => skill.length > 0);
      }
      setFormData(restoredFormData);
    }
  }, [location.state]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        skillsDropdownRef.current &&
        !skillsDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSkillsDropdownOpen(false);
      }
    };

    if (isSkillsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSkillsDropdownOpen]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Validate required fields
    if (
      !formData.title ||
      !formData.jobType ||
      !formData.location ||
      !formData.description ||
      !formData.skills ||
      formData.skills.length === 0
    ) {
      return;
    }

    // Parse salary values
    const salaryMin = formData.salaryMin
      ? parseInt(formData.salaryMin)
      : undefined;
    const salaryMax = formData.salaryMax
      ? parseInt(formData.salaryMax)
      : undefined;

    const jobData = {
      title: formData.title,
      jobType: formData.jobType as
        | 'Full time'
        | 'Part time'
        | 'Contract'
        | 'Internship',
      location: formData.location,
      description: formData.description,
      requirements: {
        skills: formData.skills,
      },
      salary:
        salaryMin || salaryMax
          ? {
              min: salaryMin,
              max: salaryMax,
              currency: 'USD',
            }
          : undefined,
      status: 'active' as const,
    };

    // Navigate to rank selector with job data and form data for restoration
    navigate('/jobs/rank-selector', { state: { jobData, formData } });
  };

  return (
    <section className="flex flex-col gap-[24px] px-[20px] py-[24px] font-inter lg:px-0 lg:pr-[24px] overflow-hidden h-full">
      <div className="flex flex-col items-center text-center text-[#1C1C1C]">
        <h1 className="text-[32px] font-semibold">Post a Job</h1>
        <p className="max-w-[520px] text-[16px] text-[#1C1C1C80]">
          Create a job listing to attract top talent
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-[720px] flex-col gap-[20px] rounded-[20px] border border-fade bg-white p-[28px] shadow-[0_18px_40px_-24px_rgba(47,81,43,0.12)]"
      >
        <Input
          label="Job title"
          name="title"
          type="text"
          placeholder="e.g Frontend developer"
          value={formData.title}
          onChange={handleChange}
          required
        />

        <Select
          label="Job type"
          name="jobType"
          value={formData.jobType}
          onChange={handleChange}
          options={[
            { value: 'Full time', label: 'Full time' },
            { value: 'Part time', label: 'Part time' },
            { value: 'Contract', label: 'Contract' },
            { value: 'Internship', label: 'Internship' },
          ]}
          placeholder="Select job type"
          required
        />

        <div className="grid grid-cols-1 gap-[20px] sm:grid-cols-2">
          <Select
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            options={[
              { value: 'United States', label: 'United States' },
              { value: 'Canada', label: 'Canada' },
              { value: 'Remote (Global)', label: 'Remote (Global)' },
              { value: 'United Kingdom', label: 'United Kingdom' },
              { value: 'Germany', label: 'Germany' },
              { value: 'France', label: 'France' },
              { value: 'Australia', label: 'Australia' },
            ]}
            placeholder="Select location"
            required
          />

          <div className="flex flex-col gap-2">
            <label className="text-[#1C1C1C] text-[16px] font-medium">
              Salary range <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Input
                name="salaryMin"
                type="number"
                placeholder="Min (k)"
                value={formData.salaryMin}
                onChange={handleChange}
                className="flex-1"
              />
              <span className="text-[#1C1C1C80]">-</span>
              <Input
                name="salaryMax"
                type="number"
                placeholder="Max (k)"
                value={formData.salaryMax}
                onChange={handleChange}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2" ref={skillsDropdownRef}>
          <label className="text-[#1C1C1C] text-[16px] font-medium">
            Required skillset <span className="text-red-500">*</span>
          </label>
          <p className="text-[#1C1C1C80] text-[14px] font-normal">
            Select one or more skills required for this position
          </p>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSkillsDropdownOpen(!isSkillsDropdownOpen)}
              className={`w-full py-3 px-4 border rounded-xl bg-[#FFFFFF] text-left flex items-center justify-between transition-all ${
                formData.skills.length === 0
                  ? 'text-[#1C1C1C33]'
                  : 'text-[#1C1C1C]'
              } ${
                isSkillsDropdownOpen
                  ? 'border-button ring-2 ring-button'
                  : 'border-fade focus:outline-none focus:ring-2 focus:ring-button focus:border-transparent'
              }`}
            >
              <span className="text-[15px]">
                {formData.skills.length === 0
                  ? 'Select skills'
                  : formData.skills.length === 1
                    ? formData.skills[0]
                    : `${formData.skills.length} skills selected`}
              </span>
              <HiChevronDown
                className={`text-[20px] transition-transform ${
                  isSkillsDropdownOpen ? 'transform rotate-180' : ''
                }`}
              />
            </button>

            {isSkillsDropdownOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-fade rounded-xl shadow-lg max-h-[300px] overflow-y-auto">
                <div className="p-2">
                  {skills.length === 0 ? (
                    <p className="text-[#1C1C1C80] text-[14px] p-2">
                      No skills available
                    </p>
                  ) : (
                    skills.map((skill: string) => {
                      const isSelected = formData.skills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => {
                            const updatedSkills = isSelected
                              ? formData.skills.filter((s) => s !== skill)
                              : [...formData.skills, skill];
                            setFormData((prev) => ({
                              ...prev,
                              skills: updatedSkills,
                            }));
                          }}
                          className={`w-full text-left px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 ${
                            isSelected
                              ? 'bg-button/10 text-[#1C1C1C] font-medium'
                              : 'text-[#1C1C1C80] hover:bg-[#F8F8F8]'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                              isSelected
                                ? 'border-button bg-button'
                                : 'border-fade'
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path d="M5 13l4 4L19 7"></path>
                              </svg>
                            )}
                          </div>
                          <span className="text-[15px]">{skill}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          {formData.skills.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {formData.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-button/10 text-[#1C1C1C] text-[14px] rounded-lg border border-button/20"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        skills: prev.skills.filter((s) => s !== skill),
                      }));
                    }}
                    className="hover:text-red-500 transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          
        </div>

        <Textarea
          label="Job Description"
          name="description"
          rows={4}
          placeholder="Describe the role, responsibilities, and requirements"
          value={formData.description}
          onChange={handleChange}
          required
        />

        <div className="mt-[12px] flex justify-center">
          <Button type="submit" variant="primary" className="max-w-[400px]">
            Continue
          </Button>
        </div>
      </form>
    </section>
  );
};

export default CompanyJobForm;
