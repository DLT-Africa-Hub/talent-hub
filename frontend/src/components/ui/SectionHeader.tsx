import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
}) => {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="flex-1">
        <h2 className="font-medium text-[22px] text-[#1C1C1C] mb-1">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[14px] text-[#1C1C1C80]">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export default SectionHeader;

