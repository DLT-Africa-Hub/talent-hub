import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  variant?: 'default' | 'minimal';
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  variant = 'default',
}) => {
  const defaultIcon = (
    <div className="w-[100px] h-[100px] rounded-[16px] bg-[#E8F5E3] flex items-center justify-center mb-[20px]">
      <div className="w-[64px] h-[64px] rounded-[10px] bg-[#DBFFC0] flex items-center justify-center">
        <span className="text-[32px] text-button font-bold">×</span>
      </div>
    </div>
  );

  if (variant === 'minimal') {
    return (
      <div className="flex flex-col items-center justify-center py-[40px]">
        {icon || defaultIcon}
        <p className="text-[16px] font-semibold text-[#1C1C1C] mb-[8px]">
          {title}
        </p>
        <p className="text-[14px] text-[#1C1C1C80] text-center max-w-[400px]">
          {description}
        </p>
        {action && <div className="mt-[20px]">{action}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-[60px] bg-white rounded-[16px] border border-fade">
      {icon || defaultIcon}
      <p className="text-[16px] font-semibold text-[#1C1C1C] mb-[8px]">
        {title}
      </p>
      <p className="text-[14px] text-[#1C1C1C80] text-center max-w-[400px]">
        {description}
      </p>
      {action && <div className="mt-[20px]">{action}</div>}
    </div>
  );
};

export default EmptyState;
