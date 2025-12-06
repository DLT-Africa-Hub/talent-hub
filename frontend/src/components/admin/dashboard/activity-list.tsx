import React from 'react';

export interface ActivityItemProps {
  activity: string;
  time: string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, time }) => {
  return (
    <div className="px-2 flex items-center gap-[10px]">
      <div className="w-[55px] h-[55px] bg-[#D9D9D9] rounded-full" />
      <div className="flex flex-col items-start text-left text-[#1C1C1CBF] gap-[6px] ">
        <p className="font-medium text-[18px]">{activity}</p>
        <p className="font-medium text-[14px]">{time}</p>
      </div>
    </div>
  );
};

export default ActivityItem;
