import React from 'react';
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { BsSend } from 'react-icons/bs';

interface ActionButton {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

interface ActionButtonGroupProps {
  primary?: ActionButton;
  secondary?: ActionButton;
  className?: string;
  layout?: 'horizontal' | 'vertical';
}

const ActionButtonGroup: React.FC<ActionButtonGroupProps> = ({
  primary,
  secondary,
  className = '',
  layout = 'horizontal',
}) => {
  if (!primary && !secondary) return null;

  const containerClasses =
    layout === 'horizontal'
      ? 'flex flex-col md:flex-row w-full gap-[15px] items-center justify-center'
      : 'flex flex-col w-full gap-[15px] items-stretch';

  return (
    <div className={`${containerClasses} ${className}`}>
      {secondary && (
        <button
          type="button"
          onClick={secondary.onClick}
          disabled={secondary.disabled}
          className="w-full flex items-center justify-center gap-[12px] border-2 border-button py-[15px] rounded-[10px] text-button cursor-pointer transition-all hover:bg-button/5 hover:border-button/80 hover:scale-[1.02] active:scale-[0.98] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {secondary.icon || <HiOutlineChatBubbleLeftRight className="text-[24px]" />}
          <p className="text-[16px] font-medium">{secondary.label}</p>
        </button>
      )}
      {primary && (
        <button
          type="button"
          onClick={primary.onClick}
          disabled={primary.disabled}
          className="w-full flex items-center justify-center gap-[12px] bg-button py-[15px] rounded-[10px] text-[#F8F8F8] cursor-pointer transition-all hover:bg-[#176300] hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {primary.icon || <BsSend className="text-[24px]" />}
          <p className="text-[16px] font-medium">{primary.label}</p>
        </button>
      )}
    </div>
  );
};

export default ActionButtonGroup;

