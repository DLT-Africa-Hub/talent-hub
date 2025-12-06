import React from 'react';
import { Graduate } from '../../../pages/admin/Graduates';
import { ImageWithFallback } from '../../ui';
import { formatSalaryPerAnnum } from '../../../utils/job.utils';

const GraduateCard: React.FC<Graduate> = ({
  name,
  role,
  email,
  matchScore,
  skills,
  avatar,
  salaryPerAnnum,
}) => {
  const progressWidth = `${matchScore}%`;

  return (
    <div className="flex flex-col border border-fade rounded-[10px] bg-white p-[20px] gap-[32px] max-w-[367px]">
      <div className="flex flex-col gap-[18px]">
        <div className="flex items-center gap-[18px]">
          <ImageWithFallback
            src={avatar}
            alt={name}
            className="w-[63px] h-[63px] rounded-[10px]"
          />
          <div className="flex flex-col gap-[8px] font-inter">
            <p className="font-semibold text-[24px] ">{name}</p>
            <p className="text-[16px] text-[#1C1C1CBF] font-sf ">{role}</p>
          </div>
        </div>
        <p className="text-[14px] text-[#1C1C1CBF] font-sf ">{email}</p>
      </div>

      <div className="flex flex-col gap-[10px]">
        <div className="flex flex-col gap-[10px]">
          <div className="flex w-full items-center justify-between">
            <p className="text-[#1C1C1CBF] text-[14px] font-sf">Match Score</p>
            <p className="text-button text-[14px] font-sf">{matchScore}%</p>
          </div>

          <div className="w-full bg-[#D9D9D9] rounded-[10px] h-[10px]">
            <div
              className="h-full bg-button rounded-[10px]"
              style={{ width: progressWidth }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-[10px]">
          <p className="text-[#1C1C1CBF] text-[14px] font-sf">Skills</p>
          <div className="flex items-center flex-wrap gap-[6px]">
            {skills.map((skill) => (
              <div
                key={skill}
                className="border-button border p-[10px] rounded-[10px] bg-[#EFFFE2] text-button"
              >
                {skill}
              </div>
            ))}
          </div>
        </div>
        {salaryPerAnnum && (
          <div className="flex flex-col gap-[10px]">
            <div className="flex w-full items-center justify-between">
              <p className="text-[#1C1C1CBF] text-[14px] font-sf">
                Expected Salary
              </p>
              <p className="text-button text-[14px] font-sf">
                {formatSalaryPerAnnum(salaryPerAnnum)}
              </p>
            </div>
          </div>
        )}
      </div>

      <button className="bg-button text-white p-[18px] rounded-[10px]">
        View Profile
      </button>
    </div>
  );
};

export default GraduateCard;
