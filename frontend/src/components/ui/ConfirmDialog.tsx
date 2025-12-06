import BaseModal from './BaseModal';
import Button from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const variantStyles = {
    danger: {
      button: 'bg-red-600 hover:bg-red-700 text-white',
      icon: 'text-red-600',
    },
    warning: {
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      icon: 'text-yellow-600',
    },
    info: {
      button: 'bg-button hover:bg-[#176300] text-white',
      icon: 'text-button',
    },
  };

  const style = variantStyles[variant];

  return (
    <BaseModal isOpen={isOpen} onClose={onCancel} size="sm">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-[#1C1C1C] mb-2">{title}</h3>
        <p className="text-sm text-[#1C1C1C80] mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={style.button}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};
