import BaseModal from '../ui/BaseModal';
import { Button } from '../ui';
import { NotificationItem } from '../../types/notification';

interface NotificationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: NotificationItem | null;
  onViewAction?: (notification: NotificationItem) => void;
}

const headerStyles: Record<
  NotificationItem['type'],
  {
    gradient: string;
    accent: string;
    iconBg: string;
  }
> = {
  job: {
    gradient: 'bg-[#E7F6EB]',
    accent: 'text-[#1B7700]',
    iconBg: 'bg-[#1B770022]',
  },
  match: {
    gradient: 'bg-[#E8F1FF]',
    accent: 'text-[#1B5F77]',
    iconBg: 'bg-[#1B5F7722]',
  },
  message: {
    gradient: 'bg-[#FFF0E5]',
    accent: 'text-[#C55000]',
    iconBg: 'bg-[#C5500022]',
  },
  application: {
    gradient: 'bg-[#F6ECFF]',
    accent: 'text-[#5D1B77]',
    iconBg: 'bg-[#5D1B7722]',
  },
  interview: {
    gradient: 'bg-[#E8ECFF]',
    accent: 'text-[#1B45A0]',
    iconBg: 'bg-[#1B45A022]',
  },
};

const NotificationDetailsModal = ({
  isOpen,
  onClose,
  notification,
  onViewAction,
}: NotificationDetailsModalProps) => {
  if (!notification) {
    return null;
  }

  const { gradient, accent, iconBg } =
    headerStyles[notification.type] ?? headerStyles.job;

  const handleView = () => {
    if (notification && onViewAction) {
      onViewAction(notification);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="md" className="p-0">
      <div className="flex flex-col text-[#1C1C1C]">
        <div
          className={`rounded-t-2xl ${gradient} px-6 py-5 border-b border-[#0000000d]`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconBg}`}
              >
                <span className={`text-lg font-semibold ${accent}`}>
                  {notification.type.slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div>
                <p className={`text-xs uppercase tracking-[0.2em] ${accent}`}>
                  {notification.type}
                </p>
                <h2 className="text-xl font-semibold leading-tight">
                  {notification.title}
                </h2>
              </div>
            </div>
            <span
              className={`text-xs px-3 py-1 rounded-full border ${
                notification.read
                  ? 'border-[#DFE4EA] text-[#7A838F]'
                  : 'border-button text-button'
              }`}
            >
              {notification.read ? 'Read' : 'New'}
            </span>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[12px] overflow-hidden shrink-0 ring-1 ring-[#0000000d]">
              <img
                src={notification.company.image}
                alt={notification.company.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm text-[#1C1C1C80]">From</p>
              <p className="font-semibold">{notification.company.name}</p>
            </div>
          </div>

          <div className="rounded-[16px] bg-[#F8F9FB] border border-[#E3E8EF] px-4 py-3 text-[15px] text-[#1C1C1C99] leading-relaxed">
            {notification.description}
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-medium text-[#1C1C1C80]">
            {notification.relatedType && (
              <span className="px-3 py-1 rounded-full bg-[#F4F6F8] border border-[#E0E6EE]">
                Related to: {notification.relatedType}
              </span>
            )}
            {notification.displayDate && (
              <span className="px-3 py-1 rounded-full bg-[#F4F6F8] border border-[#E0E6EE]">
                {notification.displayDate}
              </span>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="w-full md:w-auto mx-0 p-4"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleView}
              className="w-full md:w-auto mx-0 p-4"
              disabled={!onViewAction}
            >
              View details
            </Button>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default NotificationDetailsModal;

