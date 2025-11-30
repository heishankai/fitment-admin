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
import { OrderService } from './order.service';
import { Order } from './order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { AcceptOrderDto } from './dto/accept-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

/**
 * WebSocket Gateway for Order
 * 处理订单的实时通信功能
 */
@WebSocketGateway({
  cors: {
    origin: true, // 允许所有来源
    credentials: true, // 允许携带凭证
  },
  namespace: '/order',
})
@Injectable()
export class OrderGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(OrderGateway.name);

  @WebSocketServer()
  server: Server;

  // 存储用户连接映射：userId -> Set<socketId>
  private userSockets = new Map<number, Set<string>>();
  // 存储socket连接信息：socketId -> { userId, userType }
  private socketUsers = new Map<string, { userId: number; userType: string }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly orderService: OrderService,
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

      // 判断用户类型
      if (payload.type === 'craftsman') {
        // 工匠用户
        userId = payload.userId || payload.userid;
        userType = 'craftsman';
        this.logger.log(`工匠用户 ${userId} 已连接`);
      } else if (payload.type === 'wechat') {
        // 微信用户
        userId = payload.userId || payload.userid;
        userType = 'wechat';
        this.logger.log(`微信用户 ${userId} 已连接`);
      } else {
        this.logger.warn('未知的用户类型');
        client.disconnect();
        return;
      }

      // 保存连接信息
      client.data = { userId, userType };
      this.socketUsers.set(client.id, { userId, userType });

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // 记录连接信息（调试用）
      this.logger.log(
        `用户 ${userId} (${userType}) 已连接 Socket，当前连接数: ${this.userSockets.get(userId)!.size}`,
      );
      this.logger.log(
        `当前在线用户数: ${this.userSockets.size}，总连接数: ${this.socketUsers.size}`,
      );
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
   * 订阅消息：创建订单
   * 微信用户发送订单，系统匹配附近的工匠并通知
   */
  @SubscribeMessage('create-order')
  async handleCreateOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateOrderDto,
  ) {
    const userInfo = client.data;
    if (!userInfo || userInfo.userType !== 'wechat') {
      client.emit('error', { message: '只有微信用户可以创建订单' });
      return;
    }

    try {
      const { userId } = userInfo;

      // 解码 URL 编码的工种名称（如果存在）
      if (data.work_kind_name) {
        try {
          data.work_kind_name = decodeURIComponent(data.work_kind_name);
          this.logger.log(
            `Socket订单工种名称已解码: ${data.work_kind_name}`,
          );
        } catch (e) {
          // 如果解码失败，使用原始值
          this.logger.log(
            `Socket订单工种名称无需解码: ${data.work_kind_name}`,
          );
        }
      }

      // 创建订单并匹配工匠
      const { order, matchedCraftsmen } =
        await this.orderService.createOrder(data, userId);

      // 加载完整的订单信息（包含用户信息）
      const fullOrder = await this.orderService.findOne(order.id);

      // 通知用户订单创建成功（不显示匹配数量，等待工匠接单）
      client.emit('order-created', {
        order: {
          ...fullOrder,
          wechat_user: fullOrder.wechat_user,
        },
        matchedCount: matchedCraftsmen.length,
      });

      // 通知匹配到的所有工匠用户（弹出订单详情）
      await this.notifyMatchedCraftsmen(fullOrder, matchedCraftsmen);

      this.logger.log(
        `用户 ${userId} 创建订单 ${order.id}，匹配到 ${matchedCraftsmen.length} 个工匠`,
      );
    } catch (error) {
      this.logger.error('创建订单失败', error);
      client.emit('error', { message: '创建订单失败' });
    }
  }

  /**
   * 获取当前连接的工匠信息（调试用）
   * @returns 连接的工匠列表
   */
  getConnectedCraftsmen(): {
    totalConnections: number;
    craftsmen: Array<{ userId: number; socketCount: number }>;
  } {
    const craftsmen: Array<{ userId: number; socketCount: number }> = [];
    let totalConnections = 0;

    this.userSockets.forEach((sockets, userId) => {
      // 检查用户类型（通过 socketUsers 查找）
      let isCraftsman = false;
      for (const [socketId, userInfo] of this.socketUsers.entries()) {
        if (userInfo.userId === userId && userInfo.userType === 'craftsman') {
          isCraftsman = true;
          break;
        }
      }

      if (isCraftsman) {
        craftsmen.push({
          userId,
          socketCount: sockets.size,
        });
        totalConnections += sockets.size;
      }
    });

    return {
      totalConnections,
      craftsmen,
    };
  }

  /**
   * 通知匹配到的工匠用户（公共方法，供 HTTP 接口和 Socket 接口调用）
   * @param fullOrder 完整的订单信息
   * @param matchedCraftsmen 匹配到的工匠列表
   */
  async notifyMatchedCraftsmen(
    fullOrder: Order,
    matchedCraftsmen: Array<{ craftsman: any; distance: number }>,
  ): Promise<void> {
    this.logger.log(
      `开始通知 ${matchedCraftsmen.length} 个匹配的工匠，订单ID: ${fullOrder.id}`,
    );
    this.logger.log(
      `当前在线工匠用户: ${Array.from(this.userSockets.keys()).join(', ')}`,
    );

    if (matchedCraftsmen.length === 0) {
      this.logger.warn(`订单 ${fullOrder.id} 没有匹配到任何工匠`);
      return;
    }

    for (const { craftsman, distance } of matchedCraftsmen) {
      const craftsmanSockets = this.userSockets.get(craftsman.id);
      this.logger.log(
        `检查工匠 ${craftsman.id} (${craftsman.name || craftsman.phone})，Socket连接: ${craftsmanSockets ? craftsmanSockets.size : 0}`,
      );

      if (craftsmanSockets && craftsmanSockets.size > 0) {
        const orderData = {
          order: {
            ...fullOrder,
            wechat_user: fullOrder.wechat_user,
          },
          distance: parseFloat(distance.toFixed(2)), // 保留2位小数，转为数字
        };

        craftsmanSockets.forEach((socketId) => {
          this.logger.log(
            `发送订单通知到 Socket ${socketId}，工匠 ${craftsman.id}`,
          );
          this.server.to(socketId).emit('new-order-popup', orderData);
        });

        this.logger.log(
          `✅ 已通知工匠 ${craftsman.id} 新订单 ${fullOrder.id}，距离 ${distance.toFixed(2)}km`,
        );
      } else {
        this.logger.warn(
          `❌ 工匠 ${craftsman.id} (${craftsman.name || craftsman.phone}) 未连接 Socket，无法接收订单 ${fullOrder.id} 通知`,
        );
      }
    }
  }

  /**
   * 订阅消息：接单
   * 工匠用户接单，更新订单状态并通知用户
   */
  @SubscribeMessage('accept-order')
  async handleAcceptOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: AcceptOrderDto,
  ) {
    const userInfo = client.data;
    if (!userInfo || userInfo.userType !== 'craftsman') {
      client.emit('error', { message: '只有工匠用户可以接单' });
      return;
    }

    try {
      const { userId } = userInfo;

      // 工匠接单
      const order = await this.orderService.acceptOrder(
        data.orderId,
        userId,
      );

      // 加载完整订单信息
      const fullOrder = await this.orderService.findOne(order.id);

      // 通知接单的工匠
      client.emit('order-accepted', {
        order: {
          ...fullOrder,
          wechat_user: fullOrder.wechat_user,
          craftsman_user: fullOrder.craftsman_user,
        },
      });

      // 通知订单的用户
      const userSockets = this.userSockets.get(fullOrder.wechat_user_id);
      if (userSockets) {
        const orderData = {
          order: {
            ...fullOrder,
            wechat_user: fullOrder.wechat_user,
            craftsman_user: fullOrder.craftsman_user,
          },
        };

        userSockets.forEach((socketId) => {
          this.server.to(socketId).emit('order-status-updated', orderData);
        });
      }

      // 通知其他匹配的工匠订单已被接单（取消弹窗）
      const matchedCraftsmen = await this.orderService.matchCraftsmen(
        fullOrder.latitude!,
        fullOrder.longitude!,
        fullOrder.work_kind_name!,
        fullOrder.work_kind_id!,
      );

      for (const { craftsman } of matchedCraftsmen) {
        if (craftsman.id !== userId) {
          const craftsmanSockets = this.userSockets.get(craftsman.id);
          if (craftsmanSockets) {
            craftsmanSockets.forEach((socketId) => {
              this.server.to(socketId).emit('order-taken', {
                orderId: fullOrder.id,
                message: '订单已被其他工匠接单',
              });
            });
          }
        }
      }

      this.logger.log(`工匠 ${userId} 接单 ${data.orderId}`);
    } catch (error) {
      this.logger.error('接单失败', error);
      client.emit('error', {
        message: error instanceof Error ? error.message : '接单失败',
      });
    }
  }

  /**
   * 订阅消息：更新订单状态
   * 更新订单状态并通知相关用户
   */
  @SubscribeMessage('update-order-status')
  async handleUpdateOrderStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number } & UpdateOrderStatusDto,
  ) {
    const userInfo = client.data;
    if (!userInfo) {
      client.emit('error', { message: '未认证' });
      return;
    }

    try {
      const { orderId, order_status } = data;

      // 更新订单状态
      const order = await this.orderService.updateOrderStatus(
        orderId,
        { order_status },
      );

      // 加载完整订单信息
      const fullOrder = await this.orderService.findOne(order.id);

      // 通知订单的用户
      const userSockets = this.userSockets.get(fullOrder.wechat_user_id);
      if (userSockets) {
        const orderData = {
          order: {
            ...fullOrder,
            wechat_user: fullOrder.wechat_user,
            craftsman_user: fullOrder.craftsman_user,
          },
        };

        userSockets.forEach((socketId) => {
          this.server.to(socketId).emit('order-status-updated', orderData);
        });
      }

      // 如果订单有接单的工匠，也通知工匠
      if (fullOrder.craftsman_user_id) {
        const craftsmanSockets = this.userSockets.get(
          fullOrder.craftsman_user_id,
        );
        if (craftsmanSockets) {
          const orderData = {
            order: {
              ...fullOrder,
              wechat_user: fullOrder.wechat_user,
              craftsman_user: fullOrder.craftsman_user,
            },
          };

          craftsmanSockets.forEach((socketId) => {
            this.server.to(socketId).emit('order-status-updated', orderData);
          });
        }
      }

      this.logger.log(`订单 ${orderId} 状态更新为 ${order.order_status_name}`);
    } catch (error) {
      this.logger.error('更新订单状态失败', error);
      client.emit('error', {
        message: error instanceof Error ? error.message : '更新订单状态失败',
      });
    }
  }

  /**
   * 发送订单状态更新通知（供Service调用）
   */
  notifyOrderStatusUpdate(order: any) {
    // 通知订单的用户
    const userSockets = this.userSockets.get(order.wechat_user_id);
    if (userSockets) {
      userSockets.forEach((socketId) => {
        this.server.to(socketId).emit('order-status-updated', { order });
      });
    }

    // 如果订单有接单的工匠，也通知工匠
    if (order.craftsman_user_id) {
      const craftsmanSockets = this.userSockets.get(order.craftsman_user_id);
      if (craftsmanSockets) {
        craftsmanSockets.forEach((socketId) => {
          this.server.to(socketId).emit('order-status-updated', { order });
        });
      }
    }
  }
}

