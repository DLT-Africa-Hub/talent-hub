import { useEffect, useRef, useState } from 'react';
import { HiChevronDown } from 'react-icons/hi2';
import Modal from '../auth/Modal';
import {
  Button,
  Input,
  Select,
} from '../ui';
import RichTextEditor from '../ui/RichTextEditor';
import RankSelector, {
  RankOption,
} from '../onboarding/companyOnboarding/job/RankSelector';
import { skills } from '../../utils/material.utils';
import { companyApi } from '../../api/company';
import { CURRENCIES } from '../../utils/job.utils';

type JobCreationStep = 'details' | 'rank' | 'success';

interface JobFormData {
  title: string;
  jobType: 'Full time' | 'Part time' | 'Contract' | 'Internship' | '';
  location: string;
  salaryAmount: string;
  salaryCurrency: string;
  description: string;
  skills: string[];
  directContact: boolean;
}

type JobPayload = {
  title: string;
  jobType: 'Full time' | 'Part time' | 'Contract' | 'Internship';
  location: string;
  description: string;
  descriptionHtml?: string;
  requirements: {
    skills: string[];
  };
  directContact: boolean;
  salary?: {
    amount: number;
    currency: string;
  };
  status: 'active';
};

interface JobCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated?: () => void;
}

const defaultFormData: JobFormData = {
  title: '',
  jobType: '',
  location: '',
  salaryAmount: '',
  salaryCurrency: 'USD',
  description: '',
  skills: [],
  directContact: true, // Default to direct contact
};

const JobCreationModal = ({
  isOpen,
  onClose,
  onJobCreated,
}: JobCreationModalProps) => {
  const [step, setStep] = useState<JobCreationStep>('details');
  const [formData, setFormData] = useState<JobFormData>(defaultFormData);
  const [jobPayload, setJobPayload] = useState<JobPayload | null>(null);
  const [selectedRank, setSelectedRank] = useState<RankOption | ''>('');
  const [isSkillsDropdownOpen, setIsSkillsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const skillsDropdownRef = useRef<HTMLDivElement>(null);

  const resetState = () => {
    setStep('details');
    setFormData(defaultFormData);
    setJobPayload(null);
    setSelectedRank('');
    setIsSkillsDropdownOpen(false);
    setIsSubmitting(false);
    setError('');
    setWarning(null);
  };

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

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

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isDetailsValid =
    Boolean(formData.title) &&
    Boolean(formData.jobType) &&
    Boolean(formData.location) &&
    Boolean(formData.description) &&
    formData.skills.length > 0;

  const handleDetailsSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDetailsValid) {
      return;
    }

    const salaryAmount = formData.salaryAmount ? parseInt(formData.salaryAmount, 10) : undefined;

    const payload: JobPayload = {
      title: formData.title,
      jobType: formData.jobType as JobPayload['jobType'],
      location: formData.location,
      description: formData.description,
      descriptionHtml: formData.description, // Use same content for HTML
      requirements: {
        skills: formData.skills,
      },
      directContact: formData.directContact,
      salary: salaryAmount
        ? {
            amount: salaryAmount * 1000, // Convert from k to actual amount
            currency: formData.salaryCurrency || 'USD',
          }
        : undefined,
      status: 'active',
    };

    setJobPayload(payload);
    setStep('rank');
  };

  const handleRankSubmit = async () => {
    if (!jobPayload || !selectedRank) {
      setError('Please select a preferred rank');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await companyApi.createJob({
        ...jobPayload,
        preferedRank: selectedRank,
      });

      if (response.warning) {
        setWarning(response.warning);
      }

      onJobCreated?.();
      setStep('success');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string }; status?: number }; message?: string };
      let errorMessage = 'Failed to create job. Please try again.';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      if (
        errorMessage.toLowerCase().includes('quota') ||
        errorMessage.toLowerCase().includes('billing') ||
        error.response?.status === 402
      ) {
        errorMessage =
          'Unable to create job: AI matching quota exceeded. Please contact support.';
      } else if (errorMessage.toLowerCase().includes('rate limit')) {
        errorMessage = 'Service is busy. Please try again shortly.';
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const renderDetailsStep = () => (
    <form
      onSubmit={handleDetailsSubmit}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1 text-center text-[#1C1C1C]">
        <h2 className="text-[24px] font-semibold">Create a new job</h2>
        <p className="text-[15px] text-[#1C1C1C80]">
          Fill in the job details to start matching with candidates.
        </p>
      </div>

      <Input
        label="Job title"
        name="title"
        type="text"
        placeholder="e.g. Frontend Developer"
        value={formData.title}
        onChange={handleFormChange}
        required
      />

      <Select
        label="Job type"
        name="jobType"
        value={formData.jobType}
        onChange={handleFormChange}
        options={[
          { value: 'Full time', label: 'Full time' },
          { value: 'Part time', label: 'Part time' },
          { value: 'Contract', label: 'Contract' },
          { value: 'Internship', label: 'Internship' },
        ]}
        placeholder="Select job type"
        required
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label="Location"
          name="location"
          value={formData.location}
          onChange={handleFormChange}
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
            Salary (Annual)
          </label>
          <div className="flex gap-3">
            <Input
              name="salaryAmount"
              type="number"
              placeholder="e.g., 50 (in thousands)"
              value={formData.salaryAmount}
              onChange={handleFormChange}
              min="0"
              step="1"
              className="flex-1"
            />
            <Select
              name="salaryCurrency"
              value={formData.salaryCurrency}
              onChange={handleFormChange}
              className="w-[140px]"
              options={CURRENCIES.map((currency) => ({
                value: currency.code,
                label: `${currency.code} (${currency.symbol})`,
              }))}
            />
          </div>
          <p className="text-[12px] text-[#1C1C1C80]">
            Enter salary in thousands (e.g., 50 for $50k)
          </p>
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
            className={`w-full py-3 px-4 border rounded-xl bg-white text-left flex items-center justify-between transition-all ${
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
                            isSelected ? 'border-button bg-button' : 'border-fade'
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

      <RichTextEditor
        label="Job Description"
        value={formData.description}
        onChange={(html) => setFormData((prev) => ({ ...prev, description: html }))}
        placeholder="Describe the role, responsibilities, and requirements"
        required
        rows={6}
      />

      {/* Contact Preference Section */}
      <div className="flex flex-col gap-3 p-4 border border-fade rounded-xl bg-[#F8F8F8]">
        <div>
          <label className="text-[#1C1C1C] text-[16px] font-medium">
            Application Handling
          </label>
          <p className="text-[#1C1C1C80] text-[14px] font-normal mt-1">
            Choose how you want to handle applications for this job
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-fade bg-white hover:bg-[#F8F8F8] transition">
            <input
              type="radio"
              name="directContact"
              checked={formData.directContact === true}
              onChange={() => setFormData((prev) => ({ ...prev, directContact: true }))}
              className="mt-1 w-4 h-4 text-button focus:ring-button"
            />
            <div className="flex-1">
              <span className="text-[14px] font-medium text-[#1C1C1C] block">
                Discuss directly with applicants
              </span>
              <span className="text-[12px] text-[#1C1C1C80] block mt-1">
                You'll be able to chat and schedule interviews directly with candidates
              </span>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-fade bg-white hover:bg-[#F8F8F8] transition">
            <input
              type="radio"
              name="directContact"
              checked={formData.directContact === false}
              onChange={() => setFormData((prev) => ({ ...prev, directContact: false }))}
              className="mt-1 w-4 h-4 text-button focus:ring-button"
            />
            <div className="flex-1">
              <span className="text-[14px] font-medium text-[#1C1C1C] block">
                Let DLT Africa handle applications
              </span>
              <span className="text-[12px] text-[#1C1C1C80] block mt-1">
                DLT Africa admin team will review and manage applications on your behalf
              </span>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={handleClose}
          className="w-full md:w-auto md:min-w-[150px] mx-0"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!isDetailsValid}
          className="w-full md:w-auto md:min-w-[180px] mx-0"
        >
          Continue
        </Button>
      </div>
    </form>
  );

  const renderRankStep = () => (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => setStep('details')}
        className="flex w-fit items-center gap-[8px] rounded-[10px] border border-fade bg-[#F8F8F8] px-[16px] py-[10px] text-[14px] font-medium text-[#1C1C1C80] transition hover:text-[#1C1C1C]"
      >
        Back
      </button>

      <div className="text-center">
        <h2 className="text-[24px] font-semibold text-[#1C1C1C]">
          Select preferred rank
        </h2>
        <p className="text-[15px] text-[#1C1C1C80]">
          Choose the candidate ranking you prefer for this job posting
        </p>
      </div>

      {error && (
        <div className="rounded-[12px] bg-red-50 border border-red-200 p-[16px] text-center text-[14px] text-red-600">
          {error}
        </div>
      )}

      <RankSelector selectedRank={selectedRank} onRankSelect={setSelectedRank} />

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setStep('details')}
          className="w-full md:w-auto md:min-w-[150px] mx-0"
        >
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={!selectedRank || isSubmitting}
          onClick={handleRankSubmit}
          className="w-full md:w-auto md:min-w-[180px] mx-0"
        >
          {isSubmitting ? 'Posting...' : 'Post Job'}
        </Button>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="flex flex-col items-center gap-4 text-center py-4">
      <div className="w-20 h-20 rounded-full bg-button/10 flex items-center justify-center text-button text-4xl">
        🎉
      </div>
      <h2 className="text-[24px] font-semibold text-[#1C1C1C]">
        Job posted successfully
      </h2>
      <p className="text-[#1C1C1C80] text-[15px] max-w-[420px]">
        Your job is now live and will start receiving AI-powered matches shortly.
      </p>
      {warning && (
        <div className="w-full rounded-[12px] bg-yellow-50 border border-yellow-200 p-[16px] text-[14px] text-yellow-800">
          ⚠️ {warning}
        </div>
      )}
      <Button
        type="button"
        onClick={handleClose}
        className="w-full md:w-auto md:min-w-[200px] mx-0"
      >
        Done
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" className="max-h-[90vh] overflow-y-auto">
      {step === 'details' && renderDetailsStep()}
      {step === 'rank' && renderRankStep()}
      {step === 'success' && renderSuccessStep()}
    </Modal>
  );
};

export default JobCreationModal;

