import React, { useState } from 'react';
import Instruction from '../components/skillAssessment/Instruction';
import Assessment from '../components/skillAssessment/Assessment';

const SkillAssessment: React.FC = () => {
  const [showAssessment, setShowAssessment] = useState(false);

  const handleStartAssessment = () => {
    setShowAssessment(true);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white md:py-[80px] md:px-[150px] font-inter">
      <div className="flex flex-col md:items-center pt-[75px] h-full md:h-auto px-5 md:justify-center w-full rounded-[50px] bg-[#F9F9F9] md:py-[85px] gap-[30px]">
        {showAssessment ? (
          <Assessment />
        ) : (
          <Instruction onStart={handleStartAssessment} />
        )}
      </div>
    </div>
  );
};

export default SkillAssessment;
