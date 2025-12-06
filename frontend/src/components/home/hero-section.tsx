import { ArrowRight } from 'lucide-react';
import { PiStarFourBold } from 'react-icons/pi';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  return (
    <div className="pt-[150px] w-full relative h-auto lg:h-[106vh] overflow-hidden font-inter">
      <img
        src="droplight.png"
        loading="lazy"
        alt=""
        className="absolute top-[-180px] right-[-100px] lg:top-[-310px] lg:right-[200px]"
      />

      <div className="flex flex-col w-full items-center gap-[69px]">
        <div className="flex flex-col items-center gap-[55px] text-center">
          <div className="flex items-center text-[16px] text-[#ADED9A] bg-[#0D1904] rounded-[20px] py-2.5 px-5 gap-2.5 ">
            <PiStarFourBold />
            <p>Trusted by 500+ companies</p>
          </div>

          <div className="flex flex-col items-center gap-[20px] z-10">
            <p className="text-[#1C1C1C] text-[35px] lg:text-[64px] font-semibold max-w-[387px] lg:max-w-[773px]">
              Connect Talent With Opportunity
            </p>
            <p className="text-[#1C1C1C] text-[16px] lg:text-[18px] max-w-[387px] lg:max-w-[643px]">
              The modern platform connecting skilled professionals with
              companies for full-time, contract, and gig opportunities.
            </p>
            <div className="flex items-center gap-[20px]">
              <Link to="/register">
                <button className="text-[16px] bg-button px-[24px] py-[13px] rounded-[10px]">
                  Start working
                </button>
              </Link>
              <button className=" flex gap-[10px] items-center text-[16px] border-button border px-[24px] lg:px-[64px] py-[13px] rounded-[10px]">
                <span>Search roles</span> <ArrowRight />
              </button>
            </div>
          </div>
        </div>
        <div className="w-full relative lg:flex items-center justify-center  bg-top hidden">
          <img
            src="bgX.png"
            loading="lazy"
            alt=""
            className="absolute  w-[2510px] h-[970px] top-[-350px]"
          />

          <img
            src="hero.png"
            loading="lazy"
            className="w-[1280px] rounded-[22px] h-[828px] z-10"
            alt="heroImage"
          />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
