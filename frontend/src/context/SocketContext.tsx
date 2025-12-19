/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { messageApi } from '../api/message';
import { notificationApi } from '../api/notification';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  typingUsers: Set<string>;
  unreadMessageCount: number;
  unreadNotificationCount: number;
  sendMessage: (data: {
    receiverId: string;
    message: string;
    type?: string;
    fileUrl?: string;
    fileName?: string;
  }) => void;
  startTyping: (receiverId: string) => void;
  stopTyping: (receiverId: string) => void;
  refreshUnreadCount: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [unreadMessageCount, setUnreadMessageCount] = useState<number>(0);
  const [unreadNotificationCount, setUnreadNotificationCount] =
    useState<number>(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user || !token) {
      // Disconnect socket if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers(new Set());
      setTypingUsers(new Set());
      setUnreadMessageCount(0);
      setUnreadNotificationCount(0);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      return;
    }

    // Fetch unread counts
    const fetchUnreadCounts = async () => {
      try {
        const [messageResponse, notificationResponse] = await Promise.all([
          messageApi.getUnreadCount(),
          notificationApi.getUnreadCount(),
        ]);
        setUnreadMessageCount(messageResponse.totalUnread || 0);
        setUnreadNotificationCount(notificationResponse.count || 0);
      } catch (error) {
        console.error('Failed to fetch unread counts:', error);
        setUnreadMessageCount(0);
        setUnreadNotificationCount(0);
      }
    };

    // Initialize socket connection
    const newSocket = io(
      import.meta.env.VITE_API_BASE_URL || 'http://localhost:3090',
      {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      }
    );

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      setIsConnected(true);
      fetchUnreadCounts();
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
      setOnlineUsers(new Set());
      setTypingUsers(new Set());
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Handle online/offline users
    newSocket.on('user:online', ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
    });

    newSocket.on('user:offline', ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    // Handle typing indicators
    newSocket.on('typing:start', ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => new Set(prev).add(userId));
    });

    newSocket.on('typing:stop', ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    // Handle new messages
    newSocket.on(
      'message:new',
      (message: { receiverId: string; senderId: string }) => {
        if (user?.id && String(message.receiverId) === String(user.id)) {
          setUnreadMessageCount((prev) => prev + 1);
        }
      }
    );

    // Handle message read
    newSocket.on('message:read', () => {
      fetchUnreadCounts();
    });

    // Handle new notifications
    newSocket.on(
      'notification:new',
      (notification: {
        id: string;
        title: string;
        message: string;
        type: string;
      }) => {
        console.log('📬 New notification received:', notification);
        setUnreadNotificationCount((prev) => prev + 1);

        // Optional: Show browser notification if permission is granted
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/logo.png', // Your app logo
            tag: notification.id,
          });
        }
      }
    );

    // Handle notification updates
    newSocket.on(
      'notification:update',
      (notification: { id: string; read: boolean }) => {
        console.log('📝 Notification updated:', notification);
        // The unread count will be updated via unread:update event
      }
    );

    // Handle unread count updates
    newSocket.on(
      'unread:update',
      (counts: { notifications: number; messages: number }) => {
        console.log('🔔 Unread counts updated:', counts);
        setUnreadNotificationCount(counts.notifications);
        if (counts.messages !== undefined) {
          setUnreadMessageCount(counts.messages);
        }
      }
    );

    setSocket(newSocket);
    fetchUnreadCounts();

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user, token]);

  const stopTyping = useCallback(
    (receiverId: string) => {
      if (!socket || !isConnected) return;

      socket.emit('typing:stop', { receiverId });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    },
    [socket, isConnected]
  );

  const startTyping = useCallback(
    (receiverId: string) => {
      if (!socket || !isConnected) return;

      socket.emit('typing:start', { receiverId });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(receiverId);
      }, 3000);
    },
    [socket, isConnected, stopTyping]
  );

  const sendMessage = useCallback(
    (_data: {
      receiverId: string;
      message: string;
      type?: string;
      fileUrl?: string;
      fileName?: string;
    }) => {
      if (!socket || !isConnected) {
        console.error('Cannot send message: Socket not connected');
        return;
      }
    },
    [socket, isConnected]
  );

  const refreshUnreadCount = useCallback(async () => {
    try {
      const [messageResponse, notificationResponse] = await Promise.all([
        messageApi.getUnreadCount(),
        notificationApi.getUnreadCount(),
      ]);
      setUnreadMessageCount(messageResponse.totalUnread || 0);
      setUnreadNotificationCount(notificationResponse.count || 0);
    } catch (error) {
      console.error('Failed to refresh unread counts:', error);
    }
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        typingUsers,
        unreadMessageCount,
        unreadNotificationCount,
        sendMessage,
        startTyping,
        stopTyping,
        refreshUnreadCount,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
