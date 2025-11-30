import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';
import { IsSkillVerified } from '../is-skill-verified/is-skill-verified.entity';
import { WechatUser } from '../wechat-user/wechat-user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ORDER_MATCH_CONFIG } from '../common/constants/app.constants';

/**
 * 计算两点之间的距离（公里）
 * 使用 Haversine 公式
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // 地球半径（公里）
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 订单状态映射
 */
const ORDER_STATUS_MAP: Record<number, string> = {
  1: '待接单',
  2: '已接单',
  3: '已完成',
  4: '已取消',
};

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(CraftsmanUser)
    private readonly craftsmanUserRepository: Repository<CraftsmanUser>,
    @InjectRepository(IsSkillVerified)
    private readonly isSkillVerifiedRepository: Repository<IsSkillVerified>,
    @InjectRepository(WechatUser)
    private readonly wechatUserRepository: Repository<WechatUser>,
  ) {}

  /**
   * 创建订单并匹配附近的工匠
   * @param createOrderDto 订单信息
   * @param wechatUserId 微信用户ID
   * @returns 创建的订单和匹配的工匠列表
   */
  async createOrder(
    createOrderDto: CreateOrderDto,
    wechatUserId: number,
  ): Promise<{
    order: Order;
    matchedCraftsmen: Array<{
      craftsman: CraftsmanUser;
      distance: number; // 距离（公里）
    }>;
  }> {
    try {
      // 1. 验证微信用户是否存在
      const wechatUser = await this.wechatUserRepository.findOne({
        where: { id: wechatUserId },
      });

      if (!wechatUser) {
        throw new HttpException(
          '用户不存在，请重新登录',
          HttpStatus.NOT_FOUND,
        );
      }

      // 2. 检查用户是否已有待接单的订单
      const existingPendingOrder = await this.orderRepository.findOne({
        where: {
          wechat_user_id: wechatUserId,
          order_status: OrderStatus.PENDING,
        },
      });

      if (existingPendingOrder) {
        throw new HttpException(
          '您已有待接单的订单，请等待工匠接单后再创建新订单',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 2. 创建订单
      const order = this.orderRepository.create({
        ...createOrderDto,
        wechat_user_id: wechatUserId,
        order_status: OrderStatus.PENDING,
        order_status_name: ORDER_STATUS_MAP[OrderStatus.PENDING],
      });

      const savedOrder = await this.orderRepository.save(order);

      // 3. 匹配附近的工匠
      const matchedCraftsmen = await this.matchCraftsmen(
        createOrderDto.latitude,
        createOrderDto.longitude,
        createOrderDto.work_kind_name,
        createOrderDto.work_kind_id,
      );

      // 4. 加载完整的订单信息（包含用户信息）
      const fullOrder = await this.orderRepository.findOne({
        where: { id: savedOrder.id },
        relations: ['wechat_user'],
      });

      return {
        order: fullOrder || savedOrder,
        matchedCraftsmen,
      };
    } catch (error) {
      console.error('创建订单失败:', error);
      // 如果已经是 HttpException，直接抛出
      if (error instanceof HttpException) {
        throw error;
      }
      // 否则包装成通用错误
      throw new HttpException(
        error?.message || '创建订单失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 匹配附近的工匠
   * @param latitude 用户纬度
   * @param longitude 用户经度
   * @param workKindName 工种名称
   * @param workKindId 工种ID（可选）
   * @param maxDistance 最大距离（公里），默认使用配置
   * @returns 匹配的工匠列表（按距离排序）
   */
  async matchCraftsmen(
    latitude: number,
    longitude: number,
    workKindName: string,
    workKindId?: string,
    maxDistance: number = ORDER_MATCH_CONFIG.maxDistance,
  ): Promise<Array<{ craftsman: CraftsmanUser; distance: number }>> {
    try {
      // 解码 URL 编码的工种名称（如果存在）
      let decodedWorkKindName = workKindName;
      try {
        // 尝试解码 URL 编码
        decodedWorkKindName = decodeURIComponent(workKindName);
        console.log(
          `工种名称解码: ${workKindName} -> ${decodedWorkKindName}`,
        );
      } catch (e) {
        // 如果解码失败，使用原始值
        console.log(`工种名称无需解码: ${workKindName}`);
      }

      // 1. 查询所有有位置信息的工匠
      const craftsmen = await this.craftsmanUserRepository
        .createQueryBuilder('craftsman')
        .where('craftsman.latitude IS NOT NULL')
        .andWhere('craftsman.longitude IS NOT NULL')
        .getMany();

      // 2. 查询匹配工种的技能认证（仅通过工种名称匹配）
      const skillQuery: any = {
        workKindName: decodedWorkKindName,
      };

      // 确保只使用工种名称匹配，不包含 workKindId
      console.log(`查询技能认证，条件:`, JSON.stringify(skillQuery));

      const skills = await this.isSkillVerifiedRepository.find({
        where: skillQuery,
      });

      const skillUserIds = new Set(skills.map((skill) => skill.userId));

      // 3. 过滤工匠：必须有位置信息、有匹配的技能、在距离范围内
      const matchedCraftsmen: Array<{
        craftsman: CraftsmanUser;
        distance: number;
      }> = [];

      for (const craftsman of craftsmen) {
        // 检查是否有匹配的技能
        if (!skillUserIds.has(craftsman.id)) {
          continue;
        }

        // 计算距离
        const distance = calculateDistance(
          latitude,
          longitude,
          craftsman.latitude!,
          craftsman.longitude!,
        );

        // 检查是否在范围内
        if (distance <= maxDistance) {
          matchedCraftsmen.push({ craftsman, distance });
        }
      }

      // 4. 按距离排序
      matchedCraftsmen.sort((a, b) => a.distance - b.distance);

      console.log(
        `匹配结果: 找到 ${craftsmen.length} 个有位置的工匠，${skills.length} 个匹配的技能（工种: ${decodedWorkKindName}），最终匹配到 ${matchedCraftsmen.length} 个工匠`,
      );
      if (skills.length > 0) {
        console.log(
          `匹配的技能认证用户ID: ${skills.map((s) => s.userId).join(', ')}`,
        );
      }
      if (matchedCraftsmen.length > 0) {
        console.log(
          `匹配的工匠ID: ${matchedCraftsmen.map((m) => m.craftsman.id).join(', ')}`,
        );
      } else if (skills.length > 0) {
        console.warn(
          `⚠️ 有 ${skills.length} 个技能认证，但没有匹配到工匠（可能原因：工匠没有位置信息或距离超出范围）`,
        );
      } else {
        console.warn(
          `⚠️ 没有找到匹配的技能认证（工种: ${decodedWorkKindName}）`,
        );
      }

      return matchedCraftsmen;
    } catch (error) {
      console.error('匹配工匠失败:', error);
      return [];
    }
  }

  /**
   * 工匠接单
   * @param orderId 订单ID
   * @param craftsmanUserId 工匠用户ID
   * @returns 更新后的订单
   */
  async acceptOrder(
    orderId: number,
    craftsmanUserId: number,
  ): Promise<Order> {
    try {
      // 1. 查找订单
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 检查订单状态
      if (order.order_status !== OrderStatus.PENDING) {
        throw new HttpException(
          `订单状态为${order.order_status_name}，无法接单`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // 3. 更新订单状态
      order.order_status = OrderStatus.ACCEPTED;
      order.order_status_name = ORDER_STATUS_MAP[OrderStatus.ACCEPTED];
      order.craftsman_user_id = craftsmanUserId;

      const updatedOrder = await this.orderRepository.save(order);

      return updatedOrder;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('接单失败:', error);
      throw new HttpException('接单失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 更新订单状态
   * @param orderId 订单ID
   * @param updateOrderStatusDto 订单状态更新信息
   * @returns 更新后的订单
   */
  async updateOrderStatus(
    orderId: number,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      order.order_status = updateOrderStatusDto.order_status;
      order.order_status_name =
        ORDER_STATUS_MAP[updateOrderStatusDto.order_status];

      const updatedOrder = await this.orderRepository.save(order);

      return updatedOrder;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('更新订单状态失败:', error);
      throw new HttpException(
        '更新订单状态失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据ID获取订单（包含关联信息）
   * @param orderId 订单ID
   * @returns 订单信息
   */
  async findOne(orderId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['wechat_user', 'craftsman_user'],
    });

    if (!order) {
      throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
    }

    return order;
  }

  /**
   * 获取用户的订单列表
   * @param wechatUserId 微信用户ID
   * @returns 订单列表
   */
  async getUserOrders(wechatUserId: number): Promise<Order[]> {
    return await this.orderRepository.find({
      where: { wechat_user_id: wechatUserId },
      relations: ['wechat_user', 'craftsman_user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 获取工匠的订单列表（只返回匹配到的待接单订单，不包括已接单的）
   * @param craftsmanUserId 工匠用户ID
   * @returns 订单列表
   */
  async getCraftsmanOrders(craftsmanUserId: number): Promise<Order[]> {
    // 1. 获取工匠信息（需要位置和技能信息）
    const craftsman = await this.craftsmanUserRepository.findOne({
      where: { id: craftsmanUserId },
    });

    if (!craftsman) {
      throw new HttpException('工匠不存在', HttpStatus.NOT_FOUND);
    }

    // 2. 获取所有待接单的订单（order_status = 1）
    const pendingOrders = await this.orderRepository.find({
      where: { order_status: OrderStatus.PENDING },
      relations: ['wechat_user'],
      order: { createdAt: 'DESC' },
    });

    // 3. 过滤出匹配到当前工匠的待接单订单
    const matchedPendingOrders: Order[] = [];

    // 如果工匠没有位置信息，无法匹配
    if (craftsman.latitude && craftsman.longitude) {
      for (const order of pendingOrders) {
        // 检查订单是否有位置信息
        if (!order.latitude || !order.longitude || !order.work_kind_name) {
          continue;
        }

        // 解码工种名称
        let decodedWorkKindName = order.work_kind_name;
        try {
          decodedWorkKindName = decodeURIComponent(order.work_kind_name);
        } catch (e) {
          // 解码失败，使用原始值
        }

        // 检查是否有匹配的技能（仅通过工种名称匹配）
        const skillQuery: any = {
          workKindName: decodedWorkKindName,
          userId: craftsmanUserId,
        };

        const skills = await this.isSkillVerifiedRepository.find({
          where: skillQuery,
        });

        // 如果没有匹配的技能，跳过
        if (skills.length === 0) {
          console.log(
            `⚠️  订单 ${order.id} 没有匹配的技能认证: 工种名称=${decodedWorkKindName}, 工匠ID=${craftsmanUserId}`,
          );
          continue;
        }

        // 计算距离
        const distance = calculateDistance(
          order.latitude!,
          order.longitude!,
          craftsman.latitude!,
          craftsman.longitude!,
        );

        // 检查是否在范围内（50km）
        if (distance <= ORDER_MATCH_CONFIG.maxDistance) {
          matchedPendingOrders.push(order);
          console.log(
            `✅ 订单 ${order.id} 匹配成功: 工种=${decodedWorkKindName}, 距离=${distance.toFixed(2)}km`,
          );
        } else {
          console.log(
            `⚠️  订单 ${order.id} 距离过远: ${distance.toFixed(2)}km > ${ORDER_MATCH_CONFIG.maxDistance}km`,
          );
        }
      }
    } else {
      console.log(`⚠️  工匠 ${craftsmanUserId} 没有位置信息，无法匹配订单`);
    }

    console.log(
      `工匠 ${craftsmanUserId} 的订单列表: 匹配到的待接单订单 ${matchedPendingOrders.length} 个`,
    );

    return matchedPendingOrders;
  }

  /**
   * 获取工匠已接单的订单列表
   * @param craftsmanUserId 工匠用户ID
   * @returns 已接单的订单列表
   */
  async getAcceptedCraftsmanOrders(craftsmanUserId: number): Promise<Order[]> {
    return await this.orderRepository.find({
      where: { craftsman_user_id: craftsmanUserId },
      relations: ['wechat_user', 'craftsman_user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 根据订单状态获取工匠订单列表
   * @param craftsmanUserId 工匠用户ID
   * @param orderStatuses 订单状态数组，例如 [1,2,3,4] 表示待接单、已接单、已完成、已取消
   * @returns 订单列表
   */
  async getCraftsmanOrdersByStatus(
    craftsmanUserId: number,
    orderStatuses?: number[],
  ): Promise<Order[]> {
    // 如果没有指定订单状态，返回已接单的订单（包括已接单、已完成、已取消）
    if (!orderStatuses || orderStatuses.length === 0) {
      return await this.getAcceptedCraftsmanOrders(craftsmanUserId);
    }

    // 如果包含待接单状态（1），需要特殊处理：返回匹配到的待接单订单
    const hasPendingStatus = orderStatuses.includes(OrderStatus.PENDING);
    const otherStatuses = orderStatuses.filter(
      (status) => status !== OrderStatus.PENDING,
    );

    const orders: Order[] = [];

    // 1. 获取已接单的订单（如果状态数组中包含已接单、已完成、已取消）
    if (otherStatuses.length > 0) {
      const acceptedOrders = await this.orderRepository
        .createQueryBuilder('order')
        .where('order.craftsman_user_id = :craftsmanUserId', {
          craftsmanUserId,
        })
        .andWhere('order.order_status IN (:...statuses)', {
          statuses: otherStatuses,
        })
        .leftJoinAndSelect('order.wechat_user', 'wechat_user')
        .leftJoinAndSelect('order.craftsman_user', 'craftsman_user')
        .orderBy('order.createdAt', 'DESC')
        .getMany();
      orders.push(...acceptedOrders);
    }

    // 2. 如果包含待接单状态，获取匹配到的待接单订单
    if (hasPendingStatus) {
      const pendingOrders = await this.getCraftsmanOrders(craftsmanUserId);
      orders.push(...pendingOrders);
    }

    // 3. 去重并按创建时间倒序排序
    const uniqueOrders = orders.filter(
      (order, index, self) =>
        index === self.findIndex((o) => o.id === order.id),
    );

    uniqueOrders.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return uniqueOrders;
  }

  /**
   * 添加施工进度
   * @param orderId 订单ID
   * @param progress 施工进度信息
   * @param craftsmanUserId 工匠用户ID（用于验证订单是否属于该工匠）
   * @returns 更新后的订单
   */
  async addConstructionProgress(
    orderId: number,
    progress: {
      start_time: string;
      end_time: string;
      location: string;
      photos?: string[];
    },
    craftsmanUserId: number,
  ): Promise<Order> {
    try {
      // 1. 查找订单
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 验证订单是否属于该工匠
      if (order.craftsman_user_id !== craftsmanUserId) {
        throw new HttpException(
          '无权操作此订单',
          HttpStatus.FORBIDDEN,
        );
      }

      // 3. 验证订单状态（只有已接单的订单才能添加施工进度）
      if (order.order_status !== OrderStatus.ACCEPTED) {
        throw new HttpException(
          '只有已接单的订单才能添加施工进度',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 4. 初始化 construction_progress 数组（如果不存在）
      if (!order.construction_progress) {
        order.construction_progress = [];
      }

      // 5. 添加新的施工进度
      order.construction_progress.push({
        start_time: progress.start_time,
        end_time: progress.end_time,
        location: progress.location,
        photos: progress.photos || [],
      });

      // 6. 保存订单
      const updatedOrder = await this.orderRepository.save(order);

      // 7. 加载完整的订单信息（包含关联信息）
      const fullOrder = await this.findOne(updatedOrder.id);

      return fullOrder;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('添加施工进度失败:', error);
      throw new HttpException(
        '添加施工进度失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 添加辅材
   * @param orderId 订单ID
   * @param materials 辅材信息数组
   * @param craftsmanUserId 工匠用户ID（用于验证订单是否属于该工匠）
   * @returns null，由全局拦截器包装成标准响应
   */
  async addMaterials(
    orderId: number,
    materials: Array<{
      total_price: number;
      commodity_list: Array<{
        id: number;
        commodity_name: string;
        commodity_price: string;
        commodity_unit: string;
        quantity: number;
        commodity_cover?: string[];
      }>;
    }>,
    craftsmanUserId: number,
  ): Promise<null> {
    try {
      // 1. 查找订单
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 验证订单是否属于该工匠
      if (order.craftsman_user_id !== craftsmanUserId) {
        throw new HttpException(
          '无权操作此订单',
          HttpStatus.FORBIDDEN,
        );
      }

      // 3. 验证订单状态（只有已接单的订单才能添加辅材）
      if (order.order_status !== OrderStatus.ACCEPTED) {
        throw new HttpException(
          '只有已接单的订单才能添加辅材',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 4. 初始化 materials_list 数组（如果不存在）
      if (!order.materials_list) {
        order.materials_list = [];
      }

      // 5. 遍历 materials 数组，添加每个辅材项
      materials.forEach((materialItem) => {
        order.materials_list.push({
          total_price: materialItem.total_price,
          commodity_list: materialItem.commodity_list.map((item) => ({
            id: item.id,
            commodity_name: item.commodity_name,
            commodity_price: item.commodity_price,
            commodity_unit: item.commodity_unit,
            quantity: item.quantity,
            commodity_cover: item.commodity_cover || [],
          })),
        });
      });

      // 6. 保存订单
      await this.orderRepository.save(order);

      // 7. 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('添加辅材失败:', error);
      throw new HttpException(
        '添加辅材失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 添加工价数据
   * @param orderId 订单ID
   * @param workPrices 工价数据数组
   * @param craftsmanUserId 工匠用户ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async addWorkPrices(
    orderId: number,
    workPrices: Array<{
      total_price: number;
      prices_list: any[];
    }>,
    craftsmanUserId: number,
  ): Promise<null> {
    try {
      // 1. 查找订单
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 验证订单是否属于该工匠
      if (order.craftsman_user_id !== craftsmanUserId) {
        throw new HttpException(
          '无权操作此订单',
          HttpStatus.FORBIDDEN,
        );
      }

      // 3. 验证订单状态（只有已接单的订单才能添加工价）
      if (order.order_status !== OrderStatus.ACCEPTED) {
        throw new HttpException(
          '只有已接单的订单才能添加工价',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 4. 初始化 work_prices 数组（如果不存在）
      if (!order.work_prices) {
        order.work_prices = [];
      }

      // 5. 遍历 workPrices 数组，添加每个工价项
      workPrices.forEach((workPriceItem) => {
        order.work_prices.push({
          total_price: workPriceItem.total_price,
          prices_list: workPriceItem.prices_list,
        });
      });

      // 6. 保存订单
      await this.orderRepository.save(order);

      // 7. 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('添加工价失败:', error);
      throw new HttpException(
        '添加工价失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

