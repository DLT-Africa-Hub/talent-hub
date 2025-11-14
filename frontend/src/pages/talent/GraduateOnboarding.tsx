import React, { useState } from 'react';


import { IoMdArrowBack } from 'react-icons/io';
import { GraduateForm } from '../../constants/type';
import Personalnfo from '../../components/onboarding/graduateOnboarding/Personalnfo';
import RoleSelection from '../../components/onboarding/graduateOnboarding/RoleSelection';
import SkillSelection from '../../components/onboarding/graduateOnboarding/SkillSelection';

const GraduateOnboarding: React.FC = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<GraduateForm>({
    firstName: '',
    lastName: '',
    skills: [],
    roles: [],
    interests: [],
    socials: {},
    portfolio: '',
    rank: '',
    phoneNo:"",
    yearsOfExperience:"",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(form)

  const handleChange = (patch: Partial<GraduateForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => Math.max(0, prev - 1));

  return (
    <div className="flex flex-col items-center justify-center  lg:h-screen bg-onBoard  bg-center  bg-white md:py-[80px] md:px-[150px] font-inter">
       <div className="absolute inset-0 bg-white/25"></div>
      <div className="flex flex-col md:items-center pt-[75px] z-10 px-5 md:justify-center w-full rounded-[50px] md:py-[85px] gap-[30px]">
      <div className='flex flex-col w-full gap-2.5'>
      {step !== 0 && (
        <div className=" flex items-center cursor-pointer text-[18px] gap-2.5 justify-start " onClick={prevStep}>
        <IoMdArrowBack />Previous
        </div>
      )}
        {/* ✅ Progress Bar */}
        <div className="flex flex-col md:items-center  gap-2.5 w-full">
          <p className="text-left text-[#1C1C1CBF] text-[18px] font-normal">
            Step {step + 1} of 3
          </p>

          <div className="h-[10px] w-full md:w-[542px] bg-[#D9D9D9] rounded-full overflow-hidden">
            <div
              className="h-full bg-button transition-all duration-500 ease-in-out"
              style={{ width: `${((step + 1) / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>

        {/* ✅ Form Steps */}
        {step === 0 && (
          <Personalnfo form={form} onChange={handleChange} onNext={nextStep} />
        )}
        {step === 1 && (
          <RoleSelection
            form={form}
            onChange={handleChange}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}
        {step === 2 && (
          <SkillSelection
            form={form}
            onChange={handleChange}
            onBack={prevStep}
          />
        )}
      </div>
    </div>
  );
};

export default GraduateOnboarding;
