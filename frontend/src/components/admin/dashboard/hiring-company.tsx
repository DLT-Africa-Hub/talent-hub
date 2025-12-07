import React from 'react';

interface HiringCompanyProp {
  name: string;
  jobs: number;
  hired: number;
}

const HiringCompany: React.FC<HiringCompanyProp> = ({ name, jobs, hired }) => {
  console.log(name)
  return (
    <div className="bg-linear-to-tr text-[#1C1C1CBF] from-[#DBFFC0] to-[#83997380] p-5 rounded-[10px] flex flex-col gap-4">
      <p className="font-semibold text-[18px]">{name}</p>

      <div className="flex items-start justify-between">
        <div className="flex flex-col w-full p-2.5">
          <p className="text-[14px]">Jobs Posted</p>
          <p className="text-[14px] font-semibold">{jobs}</p>
        </div>

        <div className="flex flex-col w-full p-2.5">
          <p className="text-[14px]">Candidates Hired</p>
          <p className="text-[14px] font-semibold">{hired}</p>
        </div>
      </div>
    </div>
  );
};

export default HiringCompany;
