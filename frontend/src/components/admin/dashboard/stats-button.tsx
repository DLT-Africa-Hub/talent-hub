import React from 'react';
import { IconType } from 'react-icons';

interface StatsButtonProps {
  title: string;
  numbers: string;
  analysis: string;
  icon: IconType;
}

const StatsButton: React.FC<StatsButtonProps> = ({
  title,
  numbers,
  analysis,
  icon,
}) => {
  const Icon = icon;

  const match = analysis.match(/^([+-]?\d+(\.\d+)?%)/);

  let percentText = '';
  let restText = analysis;

  if (match) {
    percentText = match[1];
    restText = analysis.replace(percentText, '').trim();
  }

  // --- Determine color ---
  const percentColor = percentText.startsWith('-')
    ? 'text-red-500'
    : percentText.startsWith('+')
      ? 'text-green-500'
      : 'text-inherit';

  return (
    <div className="bg-white p-[20px] border border-fade rounded-[20px] font-inter min-w-[300px] flex flex-col gap-[20px]">
      <div className="flex flex-col gap-[10px]">
        <div className="flex items-center gap-[5px] text-[#1C1C1CBF] font-medium text-[16px]">
          <Icon />
          <p>{title}</p>
        </div>
        <p className="text-[#1C1C1C] text-[24px] font-semibold">{numbers}</p>
      </div>

      <p className="text-[16px] font-normal text-[#1C1C1CBF]">
        {percentText && (
          <span className={`${percentColor} font-medium`}>{percentText}</span>
        )}{' '}
        {restText}
      </p>
    </div>
  );
};

export default StatsButton;
