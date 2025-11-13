import { ReactNode } from 'react';
import { CgClose } from 'react-icons/cg';



interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

const Modal = ({ isOpen, onClose, children }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#FFFFFF] rounded-2xl shadow-lg p-6 w-[90%] max-w-[530px] relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <CgClose/>
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
