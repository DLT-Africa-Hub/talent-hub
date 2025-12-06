import React, { useState } from 'react';
import {
  DEFAULT_JOB_IMAGE,
  DEFAULT_PROFILE_IMAGE,
} from '../../utils/job.utils';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  fallback?: string;
  className?: string;
  defaultImage?: 'job' | 'profile';
  onError?: () => void;
}

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  fallback,
  className = '',
  defaultImage,
  onError,
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const getDefaultImage = () => {
    if (fallback) return fallback;
    if (defaultImage === 'profile') return DEFAULT_PROFILE_IMAGE;
    return DEFAULT_JOB_IMAGE;
  };

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(getDefaultImage());
      onError?.();
    }
  };

  return (
    <img src={imgSrc} alt={alt} className={className} onError={handleError} />
  );
};

export default ImageWithFallback;
