import { ReactNode, useMemo } from 'react';
import { CgClose } from 'react-icons/cg';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: ModalSize;
  className?: string;
  hideCloseButton?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-[420px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
  xl: 'max-w-[960px]',
};

const Modal = ({
  isOpen,
  onClose,
  children,
  size = 'md',
  className = '',
  hideCloseButton = false,
}: ModalProps) => {
  const widthClass = useMemo(() => sizeClasses[size] ?? sizeClasses.md, [size]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div
        className={`bg-[#FFFFFF] rounded-2xl shadow-lg p-4 sm:p-6 w-full ${widthClass} relative my-2 sm:my-4 max-h-[95vh] sm:max-h-[90vh] flex flex-col ${className}`.trim()}
      >
        {!hideCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 z-10"
          >
            <CgClose />
          </button>
        )}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 -mr-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
