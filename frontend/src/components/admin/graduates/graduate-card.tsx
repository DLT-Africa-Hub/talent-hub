import React from 'react';
import { Graduate } from '../../../pages/admin/Graduates';
import { ImageWithFallback } from '../../ui';
import { formatSalaryPerAnnum } from '../../../utils/job.utils';
import { CiLocationOn } from 'react-icons/ci';
import { GiRank2 } from 'react-icons/gi';

interface Props extends Graduate {
  onClick?: () => void;
}

const GraduateCard: React.FC<Props> = ({
  name,
  position,
  rank,
  expLevel,
  skills,
  profilePictureUrl,
  location,
  salaryPerAnnum,
  onClick,
}) => {
  return (
    <div className="flex flex-col border border-fade rounded-[10px] bg-white p-[20px] gap-[24px] max-w-[367px]">
      <div className="flex items-center gap-[18px]">
        <ImageWithFallback
          src={profilePictureUrl || ''}
          alt={name}
          className="w-[63px] h-[63px] rounded-[10px]"
        />
        <div className="flex flex-col gap-[4px] font-inter">
          <p className="font-semibold text-[20px]">{name || 'no name'}</p>
          <p className="text-[14px] text-[#1C1C1CBF]">{position}</p>
        </div>
      </div>
      <div className="flex justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[14px] flex items-center gap-1 text-[#1C1C1CBF]">
            <GiRank2 />
            {expLevel}
          </p>
          {location && (
            <p className="text-[14px] flex items-center gap-1 text-[#1C1C1CBF]">
              <CiLocationOn />
              {location}
            </p>
          )}
        </div>
        {rank && (
          <p className="text-[14px] border-2 border-button text-button bg-fade text-center self-start p-1.5 rounded-[20px]">
            Rank: {rank}
          </p>
        )}
      </div>

      {skills.length > 0 && (
        <div className="flex flex-col gap-[6px]">
          <p className="text-[14px] text-[#1C1C1CBF]">Skills</p>
          <div className="flex flex-wrap gap-[6px]">
            {skills.map((skill) => (
              <div
                key={skill}
                className="border-button border p-[8px] rounded-[10px] bg-[#EFFFE2] text-button text-[12px]"
              >
                {skill}
              </div>
            ))}
          </div>
        </div>
      )}

      {salaryPerAnnum && (
        <div className="flex w-full justify-between">
          <p className="text-[14px] text-[#1C1C1CBF]">Expected Salary</p>
          <p className="text-button text-[14px]">
            {formatSalaryPerAnnum(salaryPerAnnum)}
          </p>
        </div>
      )}

      <button
        className="bg-button text-white p-[14px] rounded-[10px]"
        onClick={onClick}
      >
        View Profile
      </button>
    </div>
  );
};

export default GraduateCard;
