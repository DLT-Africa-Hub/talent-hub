import React from 'react';
import { GoGift } from 'react-icons/go';
import { BsHourglass } from 'react-icons/bs';
import { TbTimeDuration5 } from 'react-icons/tb';

interface InstructionProps {
  onStart: () => void;
}

interface Guide {
  guide: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const Instruction: React.FC<InstructionProps> = ({ onStart }) => {
  const guides: Guide[] = [
    {
      guide: 'Duration',
      description: 'Assessment will take 10mins',
      icon: BsHourglass,
    },
    {
      guide: 'Passing Score',
      description: 'Score 60% or higher to be matched',
      icon: GoGift,
    },
    {
      guide: 'Intervals',
      description: 'Each Question will take 5mins',
      icon: TbTimeDuration5,
    },
  ];

  return (
    <div className="flex items-center justify-center w-full flex-col gap-6 md:gap-8 font-inter max-w-[542px] mx-auto ">
      {/* Header */}
      <div className="flex flex-col w-full gap-2.5 text-left md:text-center">
        <h2 className="font-semibold text-[32px] text-[#1C1C1C]">
          Skill Assessment Test
        </h2>
        <p className="font-normal text-[18px] text-[#1C1C1CBF]">
          Take test to grade your skill
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full ">
        {guides.map((guide) => (
          <div
            key={guide.guide}
            className="border border-fade flex items-center justify-start gap-4 rounded-xl p-4 bg-white hover:border-button/50 transition-all duration-200 "
          >
            <div className="bg-button w-[56px] h-[56px] rounded-full flex items-center justify-center text-white shrink-0">
              <guide.icon className="text-[24px]" />
            </div>
            <div className="flex flex-col items-start gap-1.5 justify-center flex-1">
              <p className="font-medium text-[16px] text-[#1C1C1C]">
                {guide.guide}
              </p>
              <p className="text-[#1C1C1CBF] font-normal text-[14px]">
                {guide.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Start Button */}
      <div className="pt-2 w-full">
        <button
          onClick={onStart}
          className="w-full md:w-[400px] mx-auto rounded-[10px] text-[16px] font-medium transition-all duration-200 h-[52px] flex items-center justify-center bg-button text-[#F8F8F8] hover:bg-button shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          Start
        </button>
      </div>
    </div>
  );
};

export default Instruction;
