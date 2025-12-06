const Features = () => {
  return (
    <div className="flex items-start justify-center flex-col lg:flex-row font-inter py-[58px] px-[20px] lg:py-[114px] h-auto lg:h-screen gap-[60px] lg:gap-[140px]">
      <div className="text-center lg:text-left flex flex-col gap-[20px] w-full max-w-[390px]">
        <p className="text-[16px] text-button font-medium">Features</p>

        <p className="text-[35px] lg:text-[48px] text-[#1C1C1C] font-semibold">
          Everything you need to succeed
        </p>
        <p className="text-[18px] text-[#1C1C1CBF] ">
          Worem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
          vulputate libero et velit interdum, ac aliquet odio mattis.
        </p>
      </div>
      <div className=" flex flex-col items-center lg:w-auto w-full gap-[7px] lg:gap-[12px]">
        <div className="flex flex-col items-center w-full lg:flex-row gap-[7px]">
          <div className="p-[34px] w-full lg:w-[440px] gap-[84px] flex flex-col items-start rounded-[20px] relative bg-[#ADED9A] overflow-hidden ">
            <div className="w-[265px] h-[265px]  bg-black absolute top-[-100px] right-[-100px] rounded-full blur-[100px]" />
            <p className="max-w-[219px] font-semibold text-[24px] text-[#1C1C1C]">
              AI-Powered Assessment
            </p>
            <p className="max-w-[219px] text-[18px] text-[#1C1C1CBF]">
              Take skill assessments and get ranked based on your technical
              expertise
            </p>
            <div className="flex flex-col gap-2.5 w-[40px] absolute bottom-[10px] right-[20px]">
              <div className="w-5 h-5 bg-black rounded-full blur-xs self-start"></div>
              <div className="w-5 h-5 bg-black rounded-full blur-xs self-end"></div>
              <div className="w-5 h-5 bg-black rounded-full blur-xs self-start"></div>
            </div>
          </div>

          <div className="p-[34px]  gap-[84px] flex flex-col w-full lg:w-[320px] rounded-[20px] bg-[#E1E1E1]">
            <p className="max-w-[219px] text-[24px] font-semibold text-[#1C1C1C]">
              Direct Communication
            </p>
            <p className="max-w-[219px] text-[18px] text-[#1C1C1CBF]">
              Chat with companies before receiving offers to ensure the perfect
              fit
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse items-center w-full lg:flex-row gap-[7px]">
          <div className="p-[34px]  gap-[84px] flex flex-col w-full lg:w-[320px] rounded-[20px] bg-[#E1E1E1]">
            <p className="max-w-[219px] text-[24px] font-semibold text-[#1C1C1C]">
              Multiple Job Types
            </p>
            <p className="max-w-[219px] text-[18px] text-[#1C1C1CBF]">
              Find full-time roles, contracts, part-time positions, or gig
              opportunities
            </p>
          </div>
          <div className="p-[34px] w-full lg:w-[440px] gap-[84px] flex flex-col items-start rounded-[20px] relative bg-[#ADED9A] overflow-hidden ">
            <div className="w-[265px] h-[265px]  bg-black absolute top-[-100px] right-[-100px] rounded-full blur-[100px]" />
            <p className="max-w-[219px] font-semibold text-[24px] text-[#1C1C1C]">
              Smart Matching
            </p>
            <p className="max-w-[219px] text-[18px] text-[#1C1C1CBF]">
              Get matched with opportunities that align with your skills and
              experience
            </p>
            <div className="flex flex-col gap-2.5 w-[40px] absolute bottom-[10px] right-[20px]">
              <div className="w-5 h-5 bg-black rounded-full blur-xs self-start"></div>
              <div className="w-5 h-5 bg-black rounded-full blur-xs self-end"></div>
              <div className="w-5 h-5 bg-black rounded-full blur-xs self-start"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;
