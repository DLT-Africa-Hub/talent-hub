import React, { ReactNode } from 'react';

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  title?: string;
}

const Modal: React.FC<ModalProps> = ({ children, onClose, title }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 bg-opacity-50">
      <div className="bg-white rounded-[12px] w-full max-w-lg p-6 relative shadow-lg">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#1C1C1C] font-bold text-lg"
        >
          ×
        </button>

        {/* Optional title */}
        {title && <h2 className="text-xl font-semibold mb-4">{title}</h2>}

        {/* Modal content */}
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
