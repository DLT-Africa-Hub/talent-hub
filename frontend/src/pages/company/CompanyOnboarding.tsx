import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

type RankOption = 'A' | 'B' | 'C' | 'D' | 'A and B' | 'B and C' | 'C and D';

const CompanyOnboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    companySize: '',
    location: '',
    preferredRank: '' as RankOption | '',
  });

  const rankOptions: RankOption[] = [
    'A',
    'B',
    'C',
    'D',
    'A and B',
    'B and C',
    'C and D',
  ];

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
  };

  const handleRankSelect = (rank: RankOption) => {
    setFormData((prev) => ({ ...prev, preferredRank: rank }));
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.companyName && formData.industry && formData.companySize && formData.location) {
      setStep(2);
    }
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.preferredRank) {
      console.log('Company onboarding data:', formData);
      // TODO: Submit to API and navigate to dashboard
      navigate('/company');
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

        {/* Step 1: Company Profile */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="flex flex-col gap-[24px]">
            <div className="mb-[8px] text-center">
              <h1 className="mb-[8px] text-[32px] font-semibold text-[#1C1C1C]">
                Company Profile
              </h1>
              <p className="text-[16px] text-[#1C1C1C80]">
                Tell us more about your company
              </p>
            </div>

            <div className="flex flex-col gap-[20px] rounded-[20px] border border-[#1B77001A] bg-white p-[28px] shadow-[0_18px_40px_-24px_rgba(47,81,43,0.12)]">
              <div className="flex flex-col gap-[8px]">
                <label className="text-[16px] font-medium text-[#1C1C1C]">
                  Company name
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="John"
                  className="h-[60px] rounded-[14px] border border-[#D9E6C9] bg-[#F8F8F8] px-[18px] text-[16px] text-[#1C1C1C] placeholder:text-[#1C1C1C66] focus:border-button focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-[8px]">
                <label className="text-[16px] font-medium text-[#1C1C1C]">
                  Industry
                </label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  className="h-[60px] rounded-[14px] border border-[#D9E6C9] bg-[#F8F8F8] px-[18px] text-[16px] text-[#1C1C1C] focus:border-button focus:outline-none"
                  required
                >
                  <option value="">Industry type</option>
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Retail">Retail</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-[8px]">
                <label className="text-[16px] font-medium text-[#1C1C1C]">
                  Company size
                </label>
                <select
                  name="companySize"
                  value={formData.companySize}
                  onChange={handleInputChange}
                  className="h-[60px] rounded-[14px] border border-[#D9E6C9] bg-[#F8F8F8] px-[18px] text-[16px] text-[#1C1C1C] focus:border-button focus:outline-none"
                  required
                >
                  <option value="">Select size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>

              <div className="flex flex-col gap-[8px]">
                <label className="text-[16px] font-medium text-[#1C1C1C]">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="City/State"
                  className="h-[60px] rounded-[14px] border border-[#D9E6C9] bg-[#F8F8F8] px-[18px] text-[16px] text-[#1C1C1C] placeholder:text-[#1C1C1C66] focus:border-button focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                className="flex h-[55px] w-full max-w-[400px] items-center justify-center rounded-[14px] bg-button text-[18px] font-semibold text-[#F8F8F8] transition hover:bg-[#176300]"
              >
                Continue
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Preferred Rank Selection */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="flex flex-col gap-[24px]">
            <div className="mb-[8px] text-center">
              <h1 className="mb-[8px] text-[32px] font-semibold text-[#1C1C1C]">
                Select your preferred rank
              </h1>
              <p className="text-[16px] text-[#1C1C1C80]">
                Choose your preferred candidate ranking
              </p>
            </div>

            <div className="flex flex-col gap-[12px] rounded-[20px] border border-[#1B77001A] bg-white p-[28px] shadow-[0_18px_40px_-24px_rgba(47,81,43,0.12)]">
              {rankOptions.map((rank) => {
                const isSelected = formData.preferredRank === rank;
                return (
                  <label
                    key={rank}
                    className={`flex cursor-pointer items-center gap-[12px] rounded-[12px] border-2 p-[16px] transition ${
                      isSelected
                        ? 'border-button bg-[#EFFFE2]'
                        : 'border-[#D9E6C9] bg-[#F8F8F8] hover:border-[#1B770080]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="preferredRank"
                      value={rank}
                      checked={isSelected}
                      onChange={() => handleRankSelect(rank)}
                      className="h-[20px] w-[20px] cursor-pointer accent-button"
                    />
                    <span className="text-[16px] font-medium text-[#1C1C1C]">
                      {rank} Rank
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                className="flex h-[55px] w-full max-w-[400px] items-center justify-center rounded-[14px] bg-button text-[18px] font-semibold text-[#F8F8F8] transition hover:bg-[#176300]"
              >
                Continue
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CompanyOnboarding;
