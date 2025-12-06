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

          <div
            className="bg-white rounded-t-[20px] flex flex-col gap-[40px] lg:gap-[63px]   relative min-h-[480px] lg:min-h-[520px] overflow-hidden"
            style={{
              background:
                'linear-gradient(white, white) padding-box, linear-gradient(to top, #66DE4333, #ADED9A) border-box',
              border: '1px solid transparent',
              borderBottom: '0px',
            }}
          >
            {/* Decorative dots - positioned at top-right, diagonal arrangement with blur effect */}
            <div className="absolute right-4 lg:right-6 top-[80px] w-[40px]  flex flex-col gap-2.5 lg:top-[50px]">
              <div className="w-5 h-5 bg-black rounded-full blur-xs self-start"></div>
              <div className="w-5 h-5 bg-black rounded-full blur-xs self-end"></div>
              <div className="w-5 h-5 bg-black rounded-full blur-xs self-start"></div>
            </div>

            <div className="flex flex-col gap-[30px] lg:gap-[45px] p-5">
              {/* Icon */}
              <div className=" top-6 left-6">
                <div className="w-12 h-12 border border-button/30 rounded-[24px] flex items-center justify-center bg-white">
                  <Briefcase className="w-6 h-6 text-[#1C1C1C]" />
                </div>
              </div>

              {/* Title */}
              <h3 className=" top-24 left-6 text-[#1C1C1C] text-[24px] lg:text-[28px] font-semibold">
                For Professionals
              </h3>
            </div>

            <div className="flex flex-col items-center w-full gap-[60px] lg:gap-[20px]">
              <div
                className="border w-auto lg:self-end min-w-[359px] p-[15px] text-center lg:text-left rounded-[10px]"
                style={{
                  background:
                    'linear-gradient(white, white) padding-box, linear-gradient(to left, #66DE4333, #ADED9A) border-box',
                  border: '1px solid transparent',
                }}
              >
                <p className="text-[#1C1C1C] text-[16px] font-medium whitespace-nowrap">
                  Free skill assessment and ranking
                </p>
              </div>

              <div
                className="border w-auto lg:self-start min-w-[359px] p-[15px] text-center lg:text-left rounded-[10px]"
                style={{
                  background:
                    'linear-gradient(white, white) padding-box, linear-gradient(to right, #66DE4333, #ADED9A) border-box',
                  border: '1px solid transparent',
                }}
              >
                <p className="text-[#1C1C1C] text-[16px] font-medium whitespace-nowrap">
                  Direct chat with hiring managers
                </p>
              </div>

              {/* AI-powered job matching - right side */}
              <div
                className="border w-auto lg:self-end min-w-[359px] p-[15px] text-center lg:text-left rounded-[10px]"
                style={{
                  background:
                    'linear-gradient(white, white) padding-box, linear-gradient(to left, #66DE4333, #ADED9A) border-box',
                  border: '1px solid transparent',
                }}
              >
                <p className="text-[#1C1C1C] text-[16px] font-medium whitespace-nowrap">
                  AI-powered job matching
                </p>
              </div>

              {/* Flexible work options - left side */}
              <div
                className="border w-auto lg:self-start min-w-[359px] p-[15px] text-center lg:text-left rounded-[10px]"
                style={{
                  background:
                    'linear-gradient(white, white) padding-box, linear-gradient(to right, #66DE4333, #ADED9A) border-box',
                  border: '1px solid transparent',
                }}
              >
                <p className="text-[#1C1C1C] text-[16px] font-medium whitespace-nowrap">
                  Flexible work options
                </p>
              </div>

              {/* Career growth tracking - right side */}
              <div
                className="border w-auto lg:self-end min-w-[359px] p-[15px] text-center lg:text-left rounded-[10px]"
                style={{
                  background:
                    'linear-gradient(white, white) padding-box, linear-gradient(to left, #66DE4333, #ADED9A) border-box',
                  border: '1px solid transparent',
                }}
              >
                <p className="text-[#1C1C1C] text-[16px] font-medium whitespace-nowrap">
                  Career growth tracking
                </p>
              </div>

              {/* Skill development resources - left side */}
              <div
                className="border w-auto lg:self-start min-w-[359px] p-[15px] text-center lg:text-left rounded-[10px]"
                style={{
                  background:
                    'linear-gradient(white, white) padding-box, linear-gradient(to right, #66DE4333, #ADED9A) border-box',
                  border: '1px solid transparent',
                }}
              >
                <p className="text-[#1C1C1C] text-[16px] font-medium whitespace-nowrap">
                  Skill development resources
                </p>
              </div>

              {/* Access to exclusive opportunities - right side */}
              <div
                className="border w-auto lg:self-end min-w-[359px] p-[15px] text-center lg:text-left rounded-[10px]"
                style={{
                  background:
                    'linear-gradient(white, white) padding-box, linear-gradient(to left, #66DE4333, #ADED9A) border-box',
                  border: '1px solid transparent',
                }}
              >
                <p className="text-[#1C1C1C] text-[16px] font-medium whitespace-nowrap">
                  Access to exclusive opportunities
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Stacked Cards */}
          <div className="flex flex-col gap-6">
            {/* For Companies Card */}
            <div className="bg-linear-to-br from-[#ADED9A] to-[#6B9B5A] rounded-[20px] p-6 lg:p-8 relative flex-1">
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
            <div className="bg-linear-to-br from-[#ADED9A] to-[#6B9B5A] rounded-[20px] p-6 lg:p-8 relative flex-1">
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
