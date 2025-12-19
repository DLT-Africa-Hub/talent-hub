import { useEffect, useState } from 'react';
import { BiBell } from 'react-icons/bi';
import { useSocket } from '../../context/SocketContext';

interface NotificationBellProps {
  count: number;
  className?: string;
  iconClassName?: string;
  badgeClassName?: string;
  showAnimation?: boolean;
}

/**
 * Animated notification bell that rings when new notifications arrive
 */
export const NotificationBell: React.FC<NotificationBellProps> = ({
  count,
  className = '',
  iconClassName = 'text-[20px]',
  badgeClassName = 'min-w-[24px] h-[24px] px-[8px] rounded-full bg-button text-white text-[12px] font-semibold',
  showAnimation = true,
}) => {
  const { socket } = useSocket();
  const [isRinging, setIsRinging] = useState(false);

  useEffect(() => {
    if (!socket || !showAnimation) return;

    const handleNewNotification = () => {
      // Trigger ring animation
      setIsRinging(true);
      setTimeout(() => setIsRinging(false), 1000);
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, showAnimation]);

  return (
    <div className={`relative ${className}`}>
      <BiBell
        className={`${iconClassName} ${isRinging ? 'animate-ring' : ''}`}
      />
      {count > 0 && (
        <span
          className={`flex items-center justify-center ${badgeClassName} absolute -top-1 -right-1`}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );
};

// Add this to your global CSS or Tailwind config:
// @keyframes ring {
//   0%, 100% { transform: rotate(0deg); }
//   10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg); }
//   20%, 40%, 60%, 80% { transform: rotate(10deg); }
// }
//
// .animate-ring {
//   animation: ring 1s ease-in-out;
// }
