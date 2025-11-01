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
import { WstService } from './wst.service';

/**
 * WebSocket Gateway for Chat
 * 处理实时聊天功能
 */
@WebSocketGateway({
  cors: {
    origin: true, // 允许所有来源
    credentials: true, // 允许携带凭证
  },
  namespace: '/chat',
})
@Injectable()
export class WstGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WstGateway.name);

  @WebSocketServer()
  server: Server;

  // 存储用户连接映射：userId -> socketId
  private userSockets = new Map<number, Set<string>>();
  // 存储socket连接信息：socketId -> { userId, userType, roomId }
  private socketUsers = new Map<string, any>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly wstService: WstService,
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

      // 兼容admin和微信两种token格式
      if (payload.type === 'wechat') {
        // 微信用户
        userId = payload.userId;
        userType = 'wechat';
        // 微信用户加入自己的房间
        const room = await this.wstService.getOrCreateRoomByWechatUser(userId);
        if (room) {
          roomId = room.id;
          client.join(`room:${roomId}`);
          this.logger.log(`微信用户 ${userId} 连接到房间 ${roomId}`);
        }
      } else {
        // 客服用户
        userId = payload.userid;
        userType = 'service';
        this.logger.log(`客服用户 ${userId} 已连接`);
      }

      // 保存连接信息
      client.data = { userId, userType, roomId };
      this.socketUsers.set(client.id, { userId, userType, roomId });

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
   * 订阅消息：加入房间
   * 客服可以通过此方法加入特定的聊天房间
   */
  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number },
  ) {
    const userInfo = client.data;
    if (!userInfo || userInfo.userType !== 'service') {
      client.emit('error', { message: '只有客服可以加入房间' });
      return;
    }

    const roomId = data.roomId;
    client.join(`room:${roomId}`);
    userInfo.roomId = roomId;
    this.socketUsers.set(client.id, userInfo);

    this.logger.log(`客服 ${userInfo.userId} 加入房间 ${roomId}`);
    client.emit('joined-room', { roomId });
  }

  /**
   * 订阅消息：发送消息
   */
  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number; content: string; messageType?: string },
  ) {
    const userInfo = client.data;
    if (!userInfo) {
      client.emit('error', { message: '未认证' });
      return;
    }

    const { userId, userType } = userInfo;
    const { roomId, content, messageType = 'text' } = data;

    // 验证用户是否在房间中
    if (userType === 'wechat') {
      if (userInfo.roomId !== roomId) {
        client.emit('error', { message: '无权访问此房间' });
        return;
      }
    }

    try {
      // 保存消息到数据库
      const message = await this.wstService.createMessage(
        roomId,
        userType === 'wechat' ? 'wechat' : 'service',
        userId,
        content,
        messageType,
      );

      // 构建消息响应（保持与数据库字段名一致）
      const messageData = {
        id: message.id,
        chat_room_id: message.chat_room_id,
        roomId: message.chat_room_id, // 兼容字段
        sender_type: message.sender_type,
        senderType: message.sender_type, // 兼容字段
        sender_id: message.sender_id,
        senderId: message.sender_id, // 兼容字段
        message_type: message.message_type || 'text',
        messageType: message.message_type || 'text', // 兼容字段
        content: message.content,
        read: message.read,
        createdAt: message.createdAt,
      };

      // 广播消息到房间内的所有客户端
      this.server.to(`room:${roomId}`).emit('new-message', messageData);

      this.logger.log(`房间 ${roomId} 收到新消息: ${content}`);
    } catch (error) {
      this.logger.error('发送消息失败', error);
      client.emit('error', { message: '发送消息失败' });
    }
  }

  /**
   * 标记消息为已读
   */
  @SubscribeMessage('mark-read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number },
  ) {
    const userInfo = client.data;
    if (!userInfo || userInfo.userType !== 'service') {
      return;
    }

    try {
      await this.wstService.markRoomAsRead(data.roomId);
      this.logger.log(`房间 ${data.roomId} 已标记为已读`);
    } catch (error) {
      this.logger.error('标记已读失败', error);
    }
  }
}
