import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import CompanyInfo, {
  CompanyInfoData,
} from '../../components/onboarding/companyOnboarding/CompanyInfo';
import RankSelector, {
  RankOption,
} from '../../components/onboarding/companyOnboarding/job/RankSelector';
import { companyApi } from '../../api/company';

const CompanyOnboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<
    CompanyInfoData & { preferredRank: RankOption | '' }
  >({
    companyName: '',
    industry: '',
    companySize: '',
    location: '',
    preferredRank: '',
  });

  const handleBack = () => {
    if (step === 1) {
      navigate('/role');
    } else {
      setStep(1);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleRankSelect = (rank: RankOption) => {
    setFormData((prev) => ({ ...prev, preferredRank: rank }));
    setError('');
  };

  const convertCompanySizeToNumber = (size: string): number => {
    // Convert size string to number for backend
    if (size === '500+') {
      return 500;
    }
    const parts = size.split('-');
    if (parts.length === 2) {
      // Return the upper bound
      return parseInt(parts[1], 10);
    }
    // Fallback to 1 if parsing fails
    return 1;
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (
      !formData.companyName ||
      !formData.industry ||
      !formData.companySize ||
      !formData.location
    ) {
      setError('Please fill in all fields');
      return;
    }

    setStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.preferredRank) {
      setError('Please select a preferred rank');
      return;
    }

    setLoading(true);
    try {
      // Convert companySize from string to number
      const companySizeNumber = convertCompanySizeToNumber(
        formData.companySize
      );

      // Create company profile
      // Note: Backend requires description, so we'll use a default value
      await companyApi.createProfile({
        companyName: formData.companyName,
        industry: formData.industry,
        companySize: companySizeNumber,
        location: formData.location,
        description: `Company profile for ${formData.companyName}`,
      });

      // Navigate to company dashboard
      navigate('/company', { replace: true });
    } catch (err: any) {
      console.error('Error creating company profile:', err);
      setError(
        err.response?.data?.message ||
          'Failed to create company profile. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = step === 1 ? 50 : 100;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-form bg-cover bg-center px-[20px] py-[40px] font-inter">
      <div className="absolute inset-0 bg-white/50"></div>

      <div className="relative z-10 w-full max-w-[600px]">
        {/* Progress Header */}
        <div className="mb-[32px] flex items-center gap-[12px]">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-[40px] w-[40px] items-center justify-center rounded-[10px] border border-fade bg-[#F8F8F8] text-[#1C1C1C] transition hover:bg-[#F0F0F0]"
          >
            <FiArrowLeft className="text-[20px]" />
          </button>
          <div className="flex-1">
            <p className="mb-[8px] text-[14px] font-medium text-[#1C1C1C]">
              Step {step} of 2
            </p>
            <div className="h-[6px] w-full overflow-hidden rounded-full bg-[#E0E0E0]">
              <div
                className="h-full bg-button transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-[20px] rounded-[12px] bg-red-50 border border-red-200 p-[16px]">
            <p className="text-[14px] text-red-600">{error}</p>
          </div>
        )}

        {/* Step 1: Company Profile */}
        {step === 1 && (
          <form
            onSubmit={handleStep1Submit}
            className="flex flex-col gap-[24px]"
          >
            <div className="mb-[8px] text-center">
              <h1 className="mb-[8px] text-[32px] font-semibold text-[#1C1C1C]">
                Company Profile
              </h1>
              <p className="text-[16px] text-[#1C1C1C80]">
                Tell us more about your company
              </p>
            </div>

            <CompanyInfo
              formData={formData}
              onInputChange={handleInputChange}
            />

            <div className="flex justify-center">
              <button
                type="submit"
                className="flex h-[55px] w-full max-w-[400px] items-center justify-center rounded-[14px] bg-button text-[18px] font-semibold text-[#F8F8F8] transition hover:bg-[#176300] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Preferred Rank Selection */}
        {step === 2 && (
          <form
            onSubmit={handleStep2Submit}
            className="flex flex-col gap-[24px]"
          >
            <div className="mb-[8px] text-center">
              <h1 className="mb-[8px] text-[32px] font-semibold text-[#1C1C1C]">
                Select your preferred rank
              </h1>
              <p className="text-[16px] text-[#1C1C1C80]">
                Choose your preferred candidate ranking
              </p>
            </div>

            <RankSelector
              selectedRank={formData.preferredRank}
              onRankSelect={handleRankSelect}
            />

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="flex h-[55px] w-full max-w-[400px] items-center justify-center rounded-[14px] bg-button text-[18px] font-semibold text-[#F8F8F8] transition hover:bg-[#176300] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Profile...' : 'Continue'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CompanyOnboarding;
