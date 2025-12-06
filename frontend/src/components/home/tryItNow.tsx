import { Link } from 'react-router-dom';

const TryItNow = () => {
  return (
    <section className="w-full py-16 lg:py-20 px-4 lg:px-6 font-inter bg-onBoard bg-center bg-white relative overflow-hidden">
      {/* Background overlay for subtle effect */}
      <div className="absolute inset-0 bg-white/50"></div>

      <div className="max-w-[1300px] mx-auto relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 min-h-[229px]">
          {/* Left Content */}
          <div className="flex flex-col gap-4 max-w-[600px]">
            {/* Small label */}
            <p className="text-[#1B7700] text-[14px] lg:text-[16px] font-semibold uppercase tracking-wide">
              Try it now
            </p>

            {/* Main heading */}
            <h2 className="text-[#1C1C1C] text-[32px] lg:text-[48px] font-semibold leading-tight">
              Ready to find your next opportunity?
            </h2>

            {/* Description */}
            <p className="text-[#1C1C1C] text-[16px] lg:text-[18px] leading-relaxed max-w-[500px]">
              Join thousands of professionals and companies already using
              TalentMatch to build successful careers and teams.
            </p>
          </div>

          {/* Right Content - CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-[10px] flex-shrink-0">
            {/* Get started button */}
            <Link to="/register">
              <button className="text-white text-[16px] bg-button hover:bg-[#176300] w-[201px] h-[45px] rounded-[10px] font-medium transition-all duration-200 hover:shadow-lg whitespace-nowrap">
                Get started
              </button>
            </Link>

            {/* Search roles button */}
            <Link to="/explore">
              <button className="text-[#1C1C1C] text-[16px] bg-white border border-[#ADED9A] hover:bg-[#F5F5F5] w-[201px] h-[45px] rounded-[10px] font-medium transition-all duration-200 whitespace-nowrap">
                Search roles
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TryItNow;
