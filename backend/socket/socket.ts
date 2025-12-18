import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { securityConfig } from '../config/secrets';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

interface SocketUser {
  socketId: string;
  userId: string;
  role: string;
}

const activeUsers = new Map<string, SocketUser>();

export const initializeSocket = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, securityConfig.jwt.accessSecret) as {
        userId: string;
        role: string;
      };

      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    const userRole = socket.userRole!;

    console.log(`✅ User connected: ${userId} (${userRole})`);

    // Add user to active users
    activeUsers.set(userId, {
      socketId: socket.id,
      userId,
      role: userRole,
    });

    // Emit online status to all connected clients
    io.emit('user:online', { userId });

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Handle joining conversation rooms
    socket.on('conversation:join', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${userId} joined conversation ${conversationId}`);
    });

    // Handle leaving conversation rooms
    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${userId} left conversation ${conversationId}`);
    });

    // Handle typing indicators
    socket.on('typing:start', ({ receiverId }: { receiverId: string }) => {
      io.to(`user:${receiverId}`).emit('typing:start', { userId });
    });

    socket.on('typing:stop', ({ receiverId }: { receiverId: string }) => {
      io.to(`user:${receiverId}`).emit('typing:stop', { userId });
    });

    // Handle message read receipts
    socket.on(
      'message:read',
      ({ messageId, senderId }: { messageId: string; senderId: string }) => {
        io.to(`user:${senderId}`).emit('message:read', { messageId, userId });
      }
    );

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${userId}`);
      activeUsers.delete(userId);
      io.emit('user:offline', { userId });
    });
  });

  return io;
};

// Helper function to emit new message to recipient
export const emitNewMessage = (
  io: Server,
  receiverId: string,
  message: any
) => {
  io.to(`user:${receiverId}`).emit('message:new', message);
};

// Helper function to emit message update
export const emitMessageUpdate = (io: Server, userId: string, message: any) => {
  io.to(`user:${userId}`).emit('message:update', message);
};

// Helper function to check if user is online
export const isUserOnline = (userId: string): boolean => {
  return activeUsers.has(userId);
};

// Helper function to get all online users
export const getOnlineUsers = (): string[] => {
  return Array.from(activeUsers.keys());
};
