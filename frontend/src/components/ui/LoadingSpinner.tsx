interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
  className?: string;
}

const LoadingSpinner = ({
  message,
  size = 'md',
  fullPage = false,
  className = '',
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-[24px] w-[24px] border-2',
    md: 'h-[40px] w-[40px] border-4',
    lg: 'h-[56px] w-[56px] border-4',
  };

  const textSizeClasses = {
    sm: 'text-[12px]',
    md: 'text-[14px]',
    lg: 'text-[16px]',
  };

  const spinner = (
    <div
      className={`inline-block animate-spin rounded-full border-solid border-button border-r-transparent ${sizeClasses[size]}`}
    />
  );

  const content = (
    <div className={`text-center ${className}`}>
      {spinner}
      {message && (
        <p className={`mt-[16px] ${textSizeClasses[size]} text-[#1C1C1C80]`}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="w-full flex items-center justify-center py-[80px] min-h-[400px]">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
