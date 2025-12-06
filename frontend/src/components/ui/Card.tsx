import React from 'react';

export type CardVariant = 'job' | 'company' | 'candidate' | 'default';

interface CardProps {
  variant?: CardVariant;
  image?: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
  imageOverlay?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
  image,
  title,
  subtitle,
  badge,
  actions,
  onClick,
  children,
  className = '',
  imageOverlay,
}) => {
  const baseClasses =
    'flex flex-col gap-[18px] rounded-[20px] border border-fade bg-white shadow-sm transition-all hover:shadow-md';
  const clickableClasses = onClick
    ? 'cursor-pointer hover:border-button/20'
    : '';

  return (
    <article
      className={`${baseClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
    >
      {image && (
        <div className="relative h-[200px] w-full overflow-hidden rounded-[16px] bg-linear-to-br from-button/10 to-button/5">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          {imageOverlay}
        </div>
      )}

      <div className="flex items-start justify-between gap-[16px] px-[18px]">
        <div className="flex-1 flex flex-col gap-[6px]">
          <h3 className="text-[22px] font-semibold text-[#1C1C1C] leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[14px] font-medium text-[#1C1C1CBF]">
              {subtitle}
            </p>
          )}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {children && <div className="px-[18px]">{children}</div>}

      {actions && <div className="px-[18px] pb-[18px]">{actions}</div>}
    </article>
  );
};

export default Card;
