import React, { useState } from 'react';
import Assessment from '../../components/skillAssessment/Assessment';
import Instruction from '../../components/skillAssessment/Instruction';


const SkillAssessment: React.FC = () => {
  const [showAssessment, setShowAssessment] = useState(false);

  const handleStartAssessment = () => {
    setShowAssessment(true);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen   lg:bg-onBoard  bg-center md:py-[80px] md:px-[150px] font-inter">
      <div className="flex flex-col md:items-center pt-[75px] h-full md:h-auto px-5 md:justify-center w-full rounded-[50px] md:py-[85px] gap-[30px]">
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
