import React from 'react';
import Button from './Button';

interface CongratulationsProps {
  title?: string;
  message: string;
  buttonText?: string;
  onButtonClick: () => void;
  className?: string;
  warning?: string | null;
}

const Congratulations: React.FC<CongratulationsProps> = ({
  title = 'Congratulations!',
  message,
  buttonText = 'Go to Dashboard',
  onButtonClick,
  className = '',
  warning,
}) => {
  return (
    <div
      className={`relative flex flex-col items-center justify-center min-h-screen bg-white overflow-hidden ${className}`}
    >
      <div className="absolute top-0 left-0 w-[200px] h-[200px] opacity-10">
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full text-button"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,100 Q50,50 100,100 T200,100"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M0,120 Q50,70 100,120 T200,120"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M0,140 Q50,90 100,140 T200,140"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 w-[200px] h-[200px] opacity-10">
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full text-button"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,100 Q50,50 100,100 T200,100"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M0,120 Q50,70 100,120 T200,120"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M0,140 Q50,90 100,140 T200,140"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-4 py-8">
        <div className="relative mb-4">
          <div className="relative w-[140px] h-[140px]">
            <div className="absolute inset-0 bg-button rounded-full shadow-lg border-4 border-[#0F5A00]"></div>
            <div className="absolute inset-[22px] bg-white rounded-full flex items-center justify-center shadow-inner">
              <svg
                className="w-[50px] h-[50px] text-button"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            <div className="w-10 h-16 bg-button rounded-b-lg transform rotate-12 origin-bottom shadow-md border-r-2 border-[#0F5A00]"></div>
            <div className="w-10 h-16 bg-button rounded-b-lg transform -rotate-12 origin-bottom shadow-md border-l-2 border-[#0F5A00]"></div>
          </div>
        </div>

        <h1 className="text-[32px] font-bold text-[#1C1C1C] text-center">
          {title}
        </h1>

        <p className="text-[16px] text-[#1C1C1C80] text-center max-w-[400px]">
          {message}
        </p>

        {/* Warning message if present */}
        {warning && (
          <div className="w-full max-w-[500px] rounded-[12px] bg-yellow-50 border border-yellow-200 p-[16px] mt-2">
            <p className="text-[14px] text-yellow-800 text-center">
              ⚠️ {warning}
            </p>
          </div>
        )}

        <div className="mt-4">
          <Button
            variant="primary"
            onClick={onButtonClick}
            className="min-w-[200px]"
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Congratulations;
