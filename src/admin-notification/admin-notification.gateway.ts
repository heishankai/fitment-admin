import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';
import { JWT_CONFIG } from '../common/constants/app.constants';
import { AdminNotification } from './admin-notification.entity';

/**
 * WebSocket Gateway for Admin Notification
 * 处理管理员通知的实时推送功能（PC端管理员）
 */
@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/admin-notification',
})
@Injectable()
export class AdminNotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AdminNotificationGateway.name);

  @WebSocketServer()
  server: Server;

  // 存储管理员连接：socketId -> { userId }
  private adminSockets = new Set<string>();

  constructor(private readonly jwtService: JwtService) {}

  /**
   * 处理客户端连接
   */
  async handleConnection(client: Socket) {
    try {
      // 从查询参数或握手头中获取token
      const token =
        client.handshake.query?.token ||
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn('连接失败：缺少token');
        client.disconnect();
        return;
      }

      // 验证token（PC端管理员token）
      const payload = await this.jwtService.verifyAsync(token, {
        secret: JWT_CONFIG.secret,
      });

      // PC端管理员连接
      this.adminSockets.add(client.id);
      this.logger.log(`PC端管理员已连接，Socket ID: ${client.id}`);

      client.data = { userId: payload.userId || payload.userid };
    } catch (error) {
      this.logger.error('连接失败:', error);
      client.disconnect();
    }
  }

  /**
   * 处理客户端断开连接
   */
  handleDisconnect(client: Socket) {
    this.adminSockets.delete(client.id);
    this.logger.log(`PC端管理员已断开连接，Socket ID: ${client.id}`);
  }

  /**
   * 通知所有PC端管理员有新的通知
   * @param notification 通知对象
   */
  notifyNewNotification(notification: AdminNotification): void {
    if (this.adminSockets.size === 0) {
      this.logger.warn('没有PC端管理员在线，无法发送通知');
      return;
    }

    const notificationData = {
      id: notification.id,
      title: notification.title,
      content: notification.content,
      notification_type: notification.notification_type,
      notification_time: notification.notification_time,
      is_read: notification.is_read,
      extra_data: notification.extra_data,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };

    // 向所有PC端管理员发送通知
    this.adminSockets.forEach((socketId) => {
      this.server.to(socketId).emit('new-notification', notificationData);
    });

    this.logger.log(
      `已通知 ${this.adminSockets.size} 个PC端管理员：新通知 ID ${notification.id}`,
    );
  }

  /**
   * 通知所有PC端管理员未读数量更新
   * @param count 未读数量
   * @param notificationType 通知类型（可选）
   */
  notifyUnreadCountUpdate(
    count: number,
    notificationType?: string,
  ): void {
    if (this.adminSockets.size === 0) {
      return;
    }

    const updateData = {
      count,
      notificationType,
      timestamp: new Date().toISOString(),
    };

    // 向所有PC端管理员发送未读数量更新
    this.adminSockets.forEach((socketId) => {
      this.server.to(socketId).emit('unread-count-update', updateData);
    });

    this.logger.log(
      `已通知 ${this.adminSockets.size} 个PC端管理员：未读数量更新为 ${count}`,
    );
  }

  /**
   * 通知所有PC端管理员通知已读状态更新
   * @param notificationId 通知ID
   * @param isRead 是否已读
   */
  notifyNotificationReadUpdate(
    notificationId: number,
    isRead: boolean,
  ): void {
    if (this.adminSockets.size === 0) {
      return;
    }

    const updateData = {
      notificationId,
      isRead,
      timestamp: new Date().toISOString(),
    };

    // 向所有PC端管理员发送已读状态更新
    this.adminSockets.forEach((socketId) => {
      this.server.to(socketId).emit('notification-read-update', updateData);
    });

    this.logger.log(
      `已通知 ${this.adminSockets.size} 个PC端管理员：通知 ${notificationId} 已读状态更新为 ${isRead}`,
    );
  }
}
