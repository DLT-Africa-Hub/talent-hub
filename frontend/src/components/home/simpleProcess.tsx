import { Building2, Briefcase } from 'lucide-react';

const SimpleProcess = () => {
  const companiesFeatures = [
    'Skill-based candidate matching',
    'Direct candidate communication',
    'Multiple hiring options',
  ];

  const contractorsFeatures = [
    'Skill-based candidate matching',
    'Direct candidate communication',
    'Multiple hiring options',
  ];

  return (
    <section className="w-full py-16 lg:py-24 px-4 lg:px-6 font-inter bg-white relative overflow-hidden">
      <div className="max-w-[1300px] mx-auto relative z-10 min-h-[792px]">
        {/* Title and Subtitle */}
        <div className="flex flex-col items-center text-center mb-12 lg:mb-[117px] gap-4">
          <h2 className="text-[#1C1C1C] text-[32px] lg:text-[48px] font-semibold leading-tight">
            Simple Process, Powerful Results
          </h2>
          <p className="text-[#1C1C1C] text-[16px] lg:text-[18px] max-w-[600px] leading-relaxed">
            Norem ipsum dolor sit amet, consectetur adipiscing elit.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* For Professionals - Left Column (Large Card with scattered tags) */}
          <div className="bg-white rounded-[20px] border border-[#1B7700]/30 relative min-h-[480px] lg:min-h-[520px] overflow-hidden">
            {/* Decorative dots - positioned at top-right, diagonal arrangement with blur effect */}
            <div className="absolute right-4 lg:right-6 top-[80px] lg:top-[90px]">
              <div className="relative w-[40px] h-[40px]">
                {/* Top dot - with blur */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[10px] h-[10px] bg-[#1C1C1C] rounded-full"
                  style={{ filter: 'blur(2px)' }}
                ></div>
                {/* Bottom-left dot - with blur */}
                <div
                  className="absolute bottom-0 left-0 w-[8px] h-[8px] bg-[#1C1C1C] rounded-full"
                  style={{ filter: 'blur(2px)' }}
                ></div>
                {/* Bottom-right dot - with blur */}
                <div
                  className="absolute bottom-1 right-0 w-[6px] h-[6px] bg-[#1C1C1C] rounded-full"
                  style={{ filter: 'blur(2px)' }}
                ></div>
              </div>
            </div>

            {/* Icon */}
            <div className="absolute top-6 left-6">
              <div className="w-12 h-12 border border-[#1B7700]/30 rounded-[24px] flex items-center justify-center bg-white">
                <Building2 className="w-6 h-6 text-[#1C1C1C]" />
              </div>
            </div>

            {/* Title */}
            <h3 className="absolute top-24 left-6 text-[#1C1C1C] text-[24px] lg:text-[28px] font-semibold">
              For Professionals
            </h3>

            {/* Scattered Feature Tags - all inside the container */}
            {/* Free skill assessment and ranking - top right area */}
            <div className="absolute top-[160px] right-4 lg:right-6">
              <div className="bg-white border border-[#1B7700]/30 rounded-[10px] px-4 py-3">
                <p className="text-[#1C1C1C] text-[14px] font-medium whitespace-nowrap">
                  Free skill assessment and ranking
                </p>
              </div>
            </div>

            {/* Direct chat with hiring managers - left side */}
            <div className="absolute top-[220px] left-4 lg:left-6">
              <div className="bg-white border border-[#1B7700]/30 rounded-[10px] px-4 py-3">
                <p className="text-[#1C1C1C] text-[14px] font-medium whitespace-nowrap">
                  Direct chat with hiring managers
                </p>
              </div>
            </div>

            {/* AI-powered job matching - right side */}
            <div className="absolute top-[280px] right-4 lg:right-6">
              <div className="bg-white border border-[#1B7700]/30 rounded-[10px] px-4 py-3">
                <p className="text-[#1C1C1C] text-[14px] font-medium whitespace-nowrap">
                  AI-powered job matching
                </p>
              </div>
            </div>

            {/* Flexible work options - left side, middle */}
            <div className="absolute top-[320px] left-8 lg:left-20">
              <div className="bg-[#F5F5F5] border border-[#1B7700]/30 rounded-[10px] px-4 py-3">
                <p className="text-[#1C1C1C] text-[14px] font-medium whitespace-nowrap">
                  Flexible work options
                </p>
              </div>
            </div>

            {/* Career growth tracking - right side */}
            <div className="absolute top-[380px] right-6 lg:right-10">
              <div className="bg-white border border-[#1B7700]/30 rounded-[10px] px-4 py-3">
                <p className="text-[#1C1C1C] text-[14px] font-medium whitespace-nowrap">
                  Career growth tracking
                </p>
              </div>
            </div>

            {/* AI-powered job matching (bottom left) */}
            <div className="absolute bottom-[60px] left-4 lg:left-6">
              <div className="bg-[#F5F5F5] border border-[#1B7700]/30 rounded-[10px] px-4 py-3">
                <p className="text-[#1C1C1C] text-[14px] font-medium whitespace-nowrap">
                  AI-powered job matching
                </p>
              </div>
            </div>

            {/* Access to exclusive opportunities - bottom right */}
            <div className="absolute bottom-4 right-4 lg:right-6">
              <div className="bg-white border border-[#1B7700]/30 rounded-[10px] px-4 py-3">
                <p className="text-[#1C1C1C] text-[14px] font-medium whitespace-nowrap">
                  Access to exclusive opportunities
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Stacked Cards */}
          <div className="flex flex-col gap-6">
            {/* For Companies Card */}
            <div className="bg-gradient-to-br from-[#ADED9A] to-[#6B9B5A] rounded-[20px] p-6 lg:p-8 relative flex-1">
              <div className="flex flex-col gap-4">
                {/* Icon with white round outline */}
                <div className="w-12 h-12 border-2 border-[#03000300]  rounded-[24px] flex items-center justify-center bg-white/20">
                  <Building2 className="w-6 h-6 text-[#1C1C1C]" />
                </div>

                {/* Title */}
                <h3 className="text-[#1C1C1C] text-[24px] lg:text-[28px] font-semibold">
                  For Companies
                </h3>

                {/* Features List */}
                <div className="flex flex-col gap-2 mt-2">
                  {companiesFeatures.map((feature, index) => (
                    <p
                      key={index}
                      className="text-[#1C1C1C] text-[14px] lg:text-[16px] font-medium"
                    >
                      {feature}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* For Contractors Card */}
            <div className="bg-gradient-to-br from-[#ADED9A] to-[#6B9B5A] rounded-[20px] p-6 lg:p-8 relative flex-1">
              <div className="flex flex-col gap-4">
                {/* Icon with white round outline */}
                <div className="w-12 h-12 border-2 border-[#03000300] rounded-[24px] flex items-center justify-center bg-white/20">
                  <Briefcase className="w-6 h-6 text-[#1C1C1C]" />
                </div>

                {/* Title */}
                <h3 className="text-[#1C1C1C] text-[24px] lg:text-[28px] font-semibold">
                  For Contractors
                </h3>

                {/* Features List */}
                <div className="flex flex-col gap-2 mt-2">
                  {contractorsFeatures.map((feature, index) => (
                    <p
                      key={index}
                      className="text-[#1C1C1C] text-[14px] lg:text-[16px] font-medium"
                    >
                      {feature}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SimpleProcess;
