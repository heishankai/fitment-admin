import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { JWT_CONFIG } from '../common/constants/app.constants';
import { SystemNotification } from './system-notification.entity';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/system-notification',
})
@Injectable()
export class SystemNotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SystemNotificationGateway.name);

  @WebSocketServer()
  server: Server;

  private readonly userSockets = new Map<number, Set<string>>();
  private readonly socketUsers = new Map<string, number>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.query?.token ||
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn('系统通知连接失败：缺少 token');
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token as string, {
        secret: JWT_CONFIG.secret,
      });

      if (payload.type !== 'craftsman') {
        this.logger.warn('系统通知连接失败：非工匠用户');
        client.disconnect();
        return;
      }

      const userId = payload.userId || payload.userid;
      if (!userId) {
        this.logger.warn('系统通知连接失败：token 缺少用户 ID');
        client.disconnect();
        return;
      }

      client.data = { userId };
      this.socketUsers.set(client.id, userId);

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(`工匠 ${userId} 已连接系统通知 Socket`);
    } catch (error) {
      this.logger.error('系统通知连接认证失败', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.socketUsers.delete(client.id);
    this.logger.log(`工匠 ${userId} 已断开系统通知 Socket`);
  }

  notifyUser(userId: number, notification: SystemNotification): void {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) {
      this.logger.warn(`工匠 ${userId} 未连接系统通知 Socket`);
      return;
    }

    sockets.forEach((socketId) => {
      this.server.to(socketId).emit('system-notification', {
        notification,
      });
    });
  }
}
