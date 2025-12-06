import React, { useState, useEffect } from 'react';
import Assessment from '../../components/skillAssessment/Assessment';
import Instruction from '../../components/skillAssessment/Instruction';
import EmailVerificationModal from '../../components/EmailVerificationModal';
import { useAuth } from '../../context/AuthContext';

const SkillAssessment: React.FC = () => {
  const { user } = useAuth();
  const [showAssessment, setShowAssessment] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  useEffect(() => {
    // Show modal if user is not verified
    if (user && (user.emailVerified === false || !user.emailVerified)) {
      // Check if user has seen the modal in this session
      const hasSeenModal = sessionStorage.getItem(
        'emailVerificationModalShown'
      );
      if (!hasSeenModal) {
        setShowVerificationModal(true);
        sessionStorage.setItem('emailVerificationModalShown', 'true');
      }
    } else {
      setShowVerificationModal(false);
    }
  }, [user]);

  const handleStartAssessment = () => {
    setShowAssessment(true);
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center h-screen   lg:bg-onBoard  bg-center md:py-[80px] md:px-[150px] font-inter">
        <div className="flex flex-col md:items-center pt-[75px] h-full md:h-auto px-5 md:justify-center w-full rounded-[50px] md:py-[85px] gap-[30px]">
          {showAssessment ? (
            <Assessment />
          ) : (
            <Instruction onStart={handleStartAssessment} />
          )}
        </div>
      </div>
      <EmailVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
      />
    </>
  );
};

export default SkillAssessment;
