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
  icon: any;
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
      description: 'Score 70% or higher to be matched',
      icon: GoGift,
    },
    {
      guide: 'Intervals',
      description: 'Each Question will take 5mins',
      icon: TbTimeDuration5,
    },
  ];

  return (
    <div className="flex justify-between items-center h-full pb-20 md:justify-center w-full flex-col md:gap-[70px] font-inter">
      {/* Header */}
      <div className="flex flex-col w-full gap-2.5 text-left md:text-center">
        <h2 className="font-semibold text-[32px] text-[#1C1C1C]">
          Skill Assessment Test
        </h2>
        <p className="font-normal text-[18px] text-[#1C1C1CBF]">
          Take test to grade your skill
        </p>
      </div>
      

      <div className="flex flex-col w-full max-w-[542px]">
        {guides.map((guide) => (
          <div
            className={`border-[1px] flex items-center justify-start gap-4 rounded-xl border-fade p-5 ${guide.guide === 'Passing Score' && 'border-none'}`}
          >
            <div className="bg-button w-[60px] h-[60px] rounded-full flex items-center text-[20px] text-white justify-center text-center">
              <guide.icon />
            </div>
            <div className="flex flex-col items-start gap-2.5 justify-center">
              <p className="font-medium text-[18px] text-[#1C1C1C]">
                {guide.guide}
              </p>
              <p className="text-[#1C1C1CB2] font-normal text-[14px]">
                {guide.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="max-w-[400px] rounded-[10px] text-[16px] p-[18px] font-medium transition-all duration-200 w-full bg-button text-[#F8F8F8] cursor-pointer"
      >
        Start
      </button>
    </div>
  );
};

export default Instruction;
