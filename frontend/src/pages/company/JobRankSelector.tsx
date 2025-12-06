import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import RankSelector, {
  RankOption,
} from '../../components/onboarding/companyOnboarding/job/RankSelector';
import { companyApi } from '../../api/company';
import { Button, Congratulations } from '../../components/ui';
import { ApiError } from '../../types/api';

interface LocationState {
  jobData: {
    title: string;
    jobType: 'Full time' | 'Part time' | 'Contract' | 'Internship';
    location: string;
    description: string;
    requirements: {
      skills: string[];
    };
    salary?: {
      amount?: number;
      currency: string;
    };
    status: 'active';
  };
  formData?: {
    title: string;
    jobType: string;
    location: string;
    salaryAmount: string;
    description: string;
    skills: string;
  };
}

const JobRankSelector = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedRank, setSelectedRank] = useState<RankOption | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const state = location.state as LocationState | null;
  const jobData = state?.jobData;
  const formData = state?.formData;

  if (!jobData) {
    navigate('/jobs/new', { replace: true });
    return null;
  }

  const handleBack = () => {
    const backFormData = formData || {
      title: jobData.title,
      jobType: jobData.jobType,
      location: jobData.location,
      salaryAmount: jobData.salary?.amount
        ? (jobData.salary.amount / 1000).toString()
        : '',
      description: jobData.description,
      skills: jobData.requirements.skills.join(', '),
    };
    navigate('/jobs/new', { state: { formData: backFormData } });
  };

  const handleRankSelect = (rank: RankOption) => {
    setSelectedRank(rank);
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRank) {
      setError('Please select a preferred rank');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const completeJobData = {
        ...jobData,
        preferedRank: selectedRank,
      };

      const response = await companyApi.createJob(completeJobData);

      // Check if there's a warning (job created without AI matching)
      if (response.warning) {
        setWarning(response.warning);
      }
      setIsSuccess(true);
    } catch (err) {
      const error = err as ApiError;
      console.error('Error creating job:', error);

      // Extract error message with better handling
      let errorMessage = 'Failed to create job. Please try again.';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Provide more helpful messages for specific error types
      if (
        errorMessage.toLowerCase().includes('quota') ||
        errorMessage.toLowerCase().includes('billing') ||
        error.response?.status === 402
      ) {
        errorMessage =
          'Unable to create job: OpenAI API quota exceeded. Please contact support or check your OpenAI account billing settings. The job cannot be created without AI matching capabilities.';
      } else if (errorMessage.toLowerCase().includes('rate limit')) {
        errorMessage =
          'Service is temporarily busy. Please wait a moment and try again.';
      }

      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/jobs');
  };

  if (isSuccess) {
    return (
      <Congratulations
        message="Job posted successfully"
        buttonText="Go to Dashboard"
        onButtonClick={handleGoToDashboard}
        warning={warning}
      />
    );
  }

  return (
    <section className="flex flex-col gap-[24px] px-[20px] py-[24px] font-inter lg:px-0 lg:pr-[24px] overflow-hidden h-full">
      <button
        type="button"
        onClick={handleBack}
        className="flex w-fit items-center gap-[8px] rounded-[10px] border border-fade bg-[#F8F8F8] px-[16px] py-[10px] text-[14px] font-medium text-[#1C1C1C80] transition hover:text-[#1C1C1C]"
      >
        <FiArrowLeft className="text-[18px]" />
        Back
      </button>

      <div className="flex flex-col items-center text-center text-[#1C1C1C]">
        <h1 className="text-[32px] font-semibold">Select Preferred Rank</h1>
        <p className="max-w-[520px] text-[16px] text-[#1C1C1C80]">
          Choose the candidate ranking you prefer for this job posting
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-[720px] flex-col gap-[15px]"
      >
        {error && (
          <div className="rounded-[12px] bg-red-50 border border-red-200 p-[16px]">
            <p className="text-[14px] text-red-600">{error}</p>
          </div>
        )}

        <RankSelector
          selectedRank={selectedRank}
          onRankSelect={handleRankSelect}
        />

        <div className="mt-[6px] flex justify-center">
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !selectedRank}
            className="max-w-[400px]"
          >
            {isSubmitting ? 'Posting Job...' : 'Post Job'}
          </Button>
        </div>
      </form>
    </section>
  );
};

export default JobRankSelector;
