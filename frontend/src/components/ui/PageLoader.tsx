import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface PageLoaderProps {
  message?: string;
  className?: string;
}

const PageLoader: React.FC<PageLoaderProps> = ({
  message = 'Loading...',
  className = '',
}) => {
  return <LoadingSpinner message={message} fullPage className={className} />;
};

export default PageLoader;
