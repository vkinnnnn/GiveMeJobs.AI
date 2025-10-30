import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private userSockets: Map<string, Set<string>> = new Map();

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      },
    });

    // Authentication middleware
    this.io.use((socket: AuthenticatedSocket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      try {
        const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
        socket.userId = decoded.id;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    console.log('✓ WebSocket service initialized');
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId;

    if (!userId) {
      socket.disconnect();
      return;
    }

    console.log(`User ${userId} connected via WebSocket (${socket.id})`);

    // Track user's socket connections
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket.id);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected (${socket.id})`);
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    });

    // Handle notification acknowledgment
    socket.on('notification:read', (notificationId: string) => {
      console.log(`User ${userId} read notification ${notificationId}`);
      // The client will call the API to mark as read
    });

    // Send connection success
    socket.emit('connected', { userId, socketId: socket.id });
  }

  /**
   * Send notification to a specific user
   */
  sendNotificationToUser(userId: string, notification: any): void {
    if (!this.io) {
      console.error('WebSocket service not initialized');
      return;
    }

    this.io.to(`user:${userId}`).emit('notification', notification);
    console.log(`Notification sent to user ${userId}`);
  }

  /**
   * Send notification to multiple users
   */
  sendNotificationToUsers(userIds: string[], notification: any): void {
    if (!this.io) {
      console.error('WebSocket service not initialized');
      return;
    }

    userIds.forEach((userId) => {
      this.io!.to(`user:${userId}`).emit('notification', notification);
    });

    console.log(`Notification sent to ${userIds.length} users`);
  }

  /**
   * Broadcast notification to all connected users
   */
  broadcastNotification(notification: any): void {
    if (!this.io) {
      console.error('WebSocket service not initialized');
      return;
    }

    this.io.emit('notification', notification);
    console.log('Notification broadcasted to all users');
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  /**
   * Get online users count
   */
  getOnlineUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Get user's active connections count
   */
  getUserConnectionsCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }

  /**
   * Disconnect all sockets for a user
   */
  disconnectUser(userId: string): void {
    if (!this.io) {
      return;
    }

    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach((socketId) => {
        const socket = this.io!.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      });
      this.userSockets.delete(userId);
    }
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.io) {
      this.io.close();
      this.userSockets.clear();
      console.log('✓ WebSocket service shut down');
    }
  }
}

export const webSocketService = new WebSocketService();
