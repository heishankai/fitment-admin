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
import { GetPrice } from './get-price.entity';

/**
 * WebSocket Gateway for GetPrice Notification
 * 处理获取报价的实时通知功能（PC端管理员）
 */
@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/get-price-notification',
})
@Injectable()
export class GetPriceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(GetPriceGateway.name);

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
   * 通知所有PC端管理员有新的获取报价记录
   * @param getPrice 获取报价记录
   */
  notifyNewGetPrice(getPrice: GetPrice): void {
    if (this.adminSockets.size === 0) {
      this.logger.warn('没有PC端管理员在线，无法发送通知');
      return;
    }

    const notification = {
      id: getPrice.id,
      area: getPrice.area,
      houseType: getPrice.houseType,
      houseTypeName: getPrice.houseTypeName,
      location: getPrice.location,
      roomType: getPrice.roomType,
      phone: getPrice.phone,
      createdAt: getPrice.createdAt,
    };

    // 向所有PC端管理员发送通知
    this.adminSockets.forEach((socketId) => {
      this.server.to(socketId).emit('new-get-price', notification);
    });

    this.logger.log(
      `已通知 ${this.adminSockets.size} 个PC端管理员：新的获取报价记录 ID ${getPrice.id}`,
    );
  }
}

