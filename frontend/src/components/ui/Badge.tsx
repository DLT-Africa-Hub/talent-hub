import React from 'react';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'default'
  | 'match-great'
  | 'match-strong'
  | 'match-good'
  | 'match-fair';

export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-[#EAF4E2] text-[#1B7700]',
  warning: 'bg-[#FFF5E0] text-[#8A6A05]',
  error: 'bg-[#FEE2E2] text-[#DC2626]',
  info: 'bg-[#E9F1FF] text-[#1B5F77]',
  default: 'bg-[#F3F4F6] text-[#1F2937]',
  'match-great': 'bg-[#ECFDF3] text-[#0F6B38]',
  'match-strong': 'bg-[#E0F2FE] text-[#0C4A6E]',
  'match-good': 'bg-[#FEF3C7] text-[#92400E]',
  'match-fair': 'bg-[#F3F4F6] text-[#1F2937]',
};

const dotStyles: Record<BadgeVariant, string> = {
  success: 'bg-[#1B7700]',
  warning: 'bg-[#8A6A05]',
  error: 'bg-[#DC2626]',
  info: 'bg-[#1B5F77]',
  default: 'bg-[#9CA3AF]',
  'match-great': 'bg-[#22C55E]',
  'match-strong': 'bg-[#38BDF8]',
  'match-good': 'bg-[#FBBF24]',
  'match-fair': 'bg-[#9CA3AF]',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[11px] px-[8px] py-[4px]',
  md: 'text-[12px] px-[12px] py-[5px]',
  lg: 'text-[14px] px-[16px] py-[8px]',
};

const dotSizeStyles: Record<BadgeSize, string> = {
  sm: 'h-[16px] w-[16px]',
  md: 'h-[22px] w-[22px]',
  lg: 'h-[28px] w-[28px]',
};

const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  dot = false,
  icon,
}) => {
  const baseStyles = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const dotStyle = dotStyles[variant];
  const dotSizeStyle = dotSizeStyles[size];

  if (dot) {
    return (
      <div
        className={`flex items-center gap-[6px] rounded-full ${baseStyles} ${sizeStyle} ${className}`}
      >
        <span
          className={`flex ${dotSizeStyle} items-center justify-center rounded-full text-white font-semibold ${dotStyle}`}
        >
          {icon || children}
        </span>
        {icon && <span>{children}</span>}
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-[6px] rounded-full ${baseStyles} ${sizeStyle} font-medium ${className}`}
    >
      {icon && <span>{icon}</span>}
      {children}
    </span>
  );
};

// Helper function to get match badge variant from score
export const getMatchBadgeVariant = (score: number): BadgeVariant => {
  const normalized = Math.min(100, Math.max(0, score));

  if (normalized >= 80) return 'match-great';
  if (normalized >= 60) return 'match-strong';
  if (normalized >= 40) return 'match-good';
  return 'match-fair';
};

// Helper function to get match badge label from score
export const getMatchBadgeLabel = (score: number): string => {
  const normalized = Math.min(100, Math.max(0, score));

  if (normalized >= 80) return 'Great fit';
  if (normalized >= 60) return 'Strong fit';
  if (normalized >= 40) return 'Good potential';
  return 'Worth reviewing';
};

export default Badge;

