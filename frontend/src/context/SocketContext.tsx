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

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  typingUsers: Set<string>;
  unreadMessageCount: number;
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
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      return;
    }

    // Fetch unread message count
    const fetchUnreadCount = async () => {
      try {
        const response = await messageApi.getUnreadCount();
        setUnreadMessageCount(response.totalUnread || 0);
      } catch (error) {
        console.error('Failed to fetch unread message count:', error);
        setUnreadMessageCount(0);
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
      // Refresh unread count on connect/reconnect
      fetchUnreadCount();
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
      // Clear online users on disconnect
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

    // Handle new messages - increment unread count if message is for current user
    newSocket.on(
      'message:new',
      (message: { receiverId: string; senderId: string }) => {
        if (user?.id && String(message.receiverId) === String(user.id)) {
          // Increment unread count when receiving a new message
          setUnreadMessageCount((prev) => prev + 1);
        }
      }
    );

    // Handle message read - refresh count (messages were marked as read)
    newSocket.on('message:read', () => {
      // Refresh unread count when messages are read
      fetchUnreadCount();
    });

    setSocket(newSocket);

    // Fetch initial unread count
    fetchUnreadCount();

    return () => {
      // Cleanup typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      // Disconnect socket
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

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Auto-stop typing after 3 seconds
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
      const response = await messageApi.getUnreadCount();
      setUnreadMessageCount(response.totalUnread || 0);
    } catch (error) {
      console.error('Failed to refresh unread message count:', error);
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
