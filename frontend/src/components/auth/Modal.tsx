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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div
        className={`bg-[#FFFFFF] rounded-2xl shadow-lg p-6 w-full ${widthClass} relative ${className}`.trim()}
      >
        {!hideCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          >
            <CgClose />
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

export default Modal;
