import { useEffect, useState } from 'react';
import {
  HiCheckCircle,
  HiXCircle,
  HiInformationCircle,
  HiExclamation,
} from 'react-icons/hi';
import { HiOutlineX } from 'react-icons/hi';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setIsVisible(true);

    // Auto-close after duration
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(toast.id), 300); // Wait for fade out
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const icons = {
    success: HiCheckCircle,
    error: HiXCircle,
    info: HiInformationCircle,
    warning: HiExclamation,
  };

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };

  const Icon = icons[toast.type];
  const styleClass = styles[toast.type];

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg min-w-[300px] max-w-[500px] transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      } ${styleClass}`}
    >
      <Icon className="text-xl shrink-0 mt-0.5" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose(toast.id), 300);
        }}
        className="shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Close"
      >
        <HiOutlineX className="text-lg" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onClose,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-9999 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};
