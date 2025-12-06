import { useState, useCallback } from 'react';
import { Toast, ToastType } from '../components/ui/Toast';

let toastIdCounter = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration?: number) => {
      const id = `toast-${++toastIdCounter}`;
      const newToast: Toast = { id, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback(
    (message: string, duration?: number) =>
      showToast(message, 'success', duration),
    [showToast]
  );

  const error = useCallback(
    (message: string, duration?: number) =>
      showToast(message, 'error', duration || 7000),
    [showToast]
  );

  const info = useCallback(
    (message: string, duration?: number) =>
      showToast(message, 'info', duration),
    [showToast]
  );

  const warning = useCallback(
    (message: string, duration?: number) =>
      showToast(message, 'warning', duration),
    [showToast]
  );

  return {
    toasts,
    success,
    error,
    info,
    warning,
    removeToast,
  };
};
