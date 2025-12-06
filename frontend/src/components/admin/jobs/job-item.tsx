import React from 'react';
import { FaArrowTrendUp } from 'react-icons/fa6';
import { HiOutlineLocationMarker } from 'react-icons/hi';
import { HiMiniUsers } from 'react-icons/hi2';

export interface JobItem {
  id: string;
  title: string;
  company: string;
  location: string;
  status: 'Active' | 'Hired' | 'Closed';
  applicants: number;
  views: number;
  salary: string;
  postedAt: string;
}

const JobItem: React.FC<JobItem> = ({
  title,
  company,
  applicants,
  location,
  salary,
  status,
  views,
}) => {
  return (
    <div className="w-full p-[20px] border border-fade rounded-[10px] bg-white gap-[20px] flex font-inter flex-col">
      <div className="flex items-start gap-[54px]">
        <div className="flex flex-col gap-2">
          <p className="text-[#1C1C1C] font-semibold text-[24px]">{title}</p>
          <p className="text-[#1C1C1CBF] font-normal text-[18px]">{company}</p>
        </div>
        <div
          className={`text-[14px] font-medium px-2.5 py-[5px] rounded-[20px] ${status === 'Active' && 'bg-[#EFFFE2] text-[#29C500] '} ${status === 'Hired' && 'bg-[#FFF8ED] text-[#ED6109] '} ${status === 'Closed' && 'bg-red-100 text-red-500 '}`}
        >
          {status}
        </div>
      </div>
      <div className="flex text-left justify-between gap-x-[185px] flex-wrap w-full max-w-[1200px] ">
        <div className="flex items-center gap-[10px]">
          <HiOutlineLocationMarker />
          <p>{location}</p>
        </div>
        <div className="flex items-center gap-[10px]">
          <HiMiniUsers />
          <p>{applicants} Applicants</p>
        </div>
        <div className="flex items-center gap-[10px]">
          <FaArrowTrendUp />
          <p>{views} Views</p>
        </div>
        <div className="flex items-center gap-[10px]">
          $<p>{salary}</p>
        </div>
      </div>
    </div>
  );
};

export default JobItem;
