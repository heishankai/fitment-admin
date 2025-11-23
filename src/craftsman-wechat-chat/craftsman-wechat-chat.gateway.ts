import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';
import { JWT_CONFIG } from '../common/constants/app.constants';
import { CraftsmanWechatChatService } from './craftsman-wechat-chat.service';

/**
 * WebSocket Gateway for Craftsman-Wechat Chat
 * 处理工匠用户与微信用户之间的实时聊天功能
 */
@WebSocketGateway({
  cors: {
    origin: true, // 允许所有来源
    credentials: true, // 允许携带凭证
  },
  namespace: '/craftsman-wechat-chat',
})
@Injectable()
export class CraftsmanWechatChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(CraftsmanWechatChatGateway.name);

  @WebSocketServer()
  server: Server;

  // 存储用户连接映射：userId -> socketId
  private userSockets = new Map<number, Set<string>>();
  // 存储socket连接信息：socketId -> { userId, userType, roomId }
  private socketUsers = new Map<string, any>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly craftsmanWechatChatService: CraftsmanWechatChatService,
  ) {}

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

      // 验证token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: JWT_CONFIG.secret,
      });

      let userId: number;
      let userType: string;
      let roomId: number | null = null;
      let otherUserId: number | null = null;

      // 兼容craftsman和wechat两种token格式
      if (payload.type === 'craftsman') {
        // 工匠用户
        userId = payload.userId || payload.userid;
        userType = 'craftsman';
        // 从查询参数获取要聊天的微信用户ID
        const wechatUserIdParam = client.handshake.query?.wechatUserId;
        otherUserId =
          wechatUserIdParam && wechatUserIdParam !== ''
            ? Number(wechatUserIdParam)
            : null;
        
        if (!otherUserId) {
          this.logger.warn(`工匠用户 ${userId} 连接失败：缺少微信用户ID`);
          client.disconnect();
          return;
        }

        // 获取或创建房间
        const room = await this.craftsmanWechatChatService.getOrCreateRoom(
          userId,
          otherUserId,
        );
        if (room) {
          roomId = room.id;
          client.join(`room:${roomId}`);
          this.logger.log(
            `工匠用户 ${userId} 连接到房间 ${roomId}（与微信用户 ${otherUserId}）`,
          );
        }
      } else if (payload.type === 'wechat') {
        // 微信用户
        userId = payload.userId || payload.userid;
        userType = 'wechat';
        // 从查询参数获取要聊天的工匠用户ID
        const craftsmanUserIdParam = client.handshake.query?.craftsmanUserId;
        otherUserId =
          craftsmanUserIdParam && craftsmanUserIdParam !== ''
            ? Number(craftsmanUserIdParam)
            : null;
        
        if (!otherUserId) {
          this.logger.warn(`微信用户 ${userId} 连接失败：缺少工匠用户ID`);
          client.disconnect();
          return;
        }

        // 获取或创建房间
        const room = await this.craftsmanWechatChatService.getOrCreateRoom(
          otherUserId,
          userId,
        );
        if (room) {
          roomId = room.id;
          client.join(`room:${roomId}`);
          this.logger.log(
            `微信用户 ${userId} 连接到房间 ${roomId}（与工匠用户 ${otherUserId}）`,
          );
        }
      } else {
        this.logger.warn('连接失败：无效的用户类型');
        client.disconnect();
        return;
      }

      // 保存连接信息
      client.data = { userId, userType, roomId, otherUserId };
      this.socketUsers.set(client.id, { userId, userType, roomId, otherUserId });

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
    } catch (error) {
      this.logger.error('连接认证失败', error);
      client.disconnect();
    }
  }

  /**
   * 处理客户端断开连接
   */
  handleDisconnect(client: Socket) {
    const userInfo = this.socketUsers.get(client.id);
    if (userInfo) {
      const { userId } = userInfo;
      const userSockets = this.userSockets.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.socketUsers.delete(client.id);
      this.logger.log(`用户 ${userId} 断开连接`);
    }
  }

  /**
   * 处理发送消息
   */
  @SubscribeMessage('send-message')
  async handleSendMessage(
    @MessageBody() data: { roomId: number; content: string; message_type?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { userId, userType, roomId } = client.data;

      if (!userId || !userType || !roomId) {
        client.emit('error', { message: '用户信息不完整' });
        return;
      }

      if (data.roomId !== roomId) {
        client.emit('error', { message: '房间ID不匹配' });
        return;
      }

      // 创建消息
      const message = await this.craftsmanWechatChatService.createMessage(
        roomId,
        userType,
        userId,
        data.content,
        data.message_type || 'text',
      );

      // 构建消息响应
      const messageData = {
        id: message.id,
        chat_room_id: message.chat_room_id,
        roomId: message.chat_room_id,
        sender_type: message.sender_type,
        senderType: message.sender_type,
        sender_id: message.sender_id,
        senderId: message.sender_id,
        message_type: message.message_type || 'text',
        messageType: message.message_type || 'text',
        content: message.content,
        read: message.read,
        createdAt: message.createdAt,
      };

      // 广播消息到房间内的所有客户端
      this.server.to(`room:${roomId}`).emit('new-message', messageData);

      this.logger.log(
        `用户 ${userId} (${userType}) 在房间 ${roomId} 发送消息`,
      );
    } catch (error) {
      this.logger.error('发送消息失败', error);
      client.emit('error', { message: '发送消息失败' });
    }
  }

  /**
   * 处理标记消息为已读
   */
  @SubscribeMessage('mark-read')
  async handleMarkRead(
    @MessageBody() data: { roomId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { userId, userType, roomId } = client.data;

      if (!userId || !userType || !roomId) {
        return;
      }

      if (data.roomId !== roomId) {
        return;
      }

      // 标记房间消息为已读
      await this.craftsmanWechatChatService.markRoomAsRead(roomId, userType);

      // 通知房间内的其他客户端
      this.server.to(`room:${roomId}`).emit('messages-read', { roomId });
    } catch (error) {
      this.logger.error('标记已读失败', error);
    }
  }
}

