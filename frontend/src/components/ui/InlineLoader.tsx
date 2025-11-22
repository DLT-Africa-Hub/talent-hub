import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface InlineLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

const InlineLoader: React.FC<InlineLoaderProps> = ({
  size = 'md',
  message,
  className = '',
}) => {
  if (message) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <LoadingSpinner message={message} />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} border-2 border-button border-t-transparent rounded-full animate-spin`}
      />
    </div>
  );
};

export default InlineLoader;

