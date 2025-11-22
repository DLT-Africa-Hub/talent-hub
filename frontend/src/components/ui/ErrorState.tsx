import React from 'react';
import { HiOutlineExclamationCircle } from 'react-icons/hi2';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  variant?: 'inline' | 'fullPage';
  className?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  variant = 'inline',
  className = '',
}) => {
  if (variant === 'fullPage') {
    return (
      <div className={`flex flex-col items-center justify-center py-[60px] ${className}`}>
        <div className="w-[100px] h-[100px] rounded-[16px] bg-red-50 flex items-center justify-center mb-[20px]">
          <HiOutlineExclamationCircle className="text-[48px] text-red-500" />
        </div>
        <p className="text-[16px] font-semibold text-[#1C1C1C] mb-[8px]">
          {title}
        </p>
        <p className="text-[14px] text-[#1C1C1C80] text-center max-w-[400px] mb-[20px]">
          {message}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-[20px] py-[12px] rounded-[10px] bg-button text-white text-[14px] font-semibold hover:bg-[#176300] transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-[12px] bg-red-50 border border-red-200 p-[16px] ${className}`}>
      <div className="flex items-start gap-3">
        <HiOutlineExclamationCircle className="text-[20px] text-red-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          {title && (
            <p className="text-[14px] font-semibold text-red-800 mb-1">{title}</p>
          )}
          <p className="text-[14px] text-red-600">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-[13px] text-red-700 font-medium hover:text-red-800 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorState;

