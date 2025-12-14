import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';
import { IsSkillVerified } from '../is-skill-verified/is-skill-verified.entity';
import { WechatUser } from '../wechat-user/wechat-user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { AcceptWorkPriceDto } from './dto/accept-work-price.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ORDER_MATCH_CONFIG } from '../common/constants/app.constants';
import { BadRequestException } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';
import { WalletTransactionService } from '../wallet-transaction/wallet-transaction.service';
import { WalletTransactionType } from '../wallet-transaction/wallet-transaction.entity';

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
 * 工长费用 & 上门次数 计算公式
 * 规则：
 * 1. 不足60平按照60平计算
 * 2. 60-200平按照对应面积段配置
 * 3. 超出200平按照规则递增（每10平，基础费用+400，基础上门次数+2，step+2000）
 * @param area - 面积（㎡）
 * @param cost - 施工费用（元）
 * @returns {{ foremanFee: number, visits: number }}
 */
function calcForeman(area: number, cost: number): {
  foremanFee: number;
  visits: number;
} {
  // 规则1：不足60平按照60平计算
  const actualArea = Math.max(area, 60);

  // 1. 面积段基础信息配置（根据图片表格完整配置）
  const areaConfigs = [
    { min: 60, max: 70, baseFee: 8000, baseVisit: 24, step: 18000 },
    { min: 70, max: 80, baseFee: 8400, baseVisit: 26, step: 20000 },
    { min: 80, max: 90, baseFee: 8800, baseVisit: 28, step: 22000 },
    { min: 90, max: 100, baseFee: 9200, baseVisit: 30, step: 24000 },
    { min: 100, max: 110, baseFee: 9600, baseVisit: 32, step: 26000 },
    { min: 110, max: 120, baseFee: 10000, baseVisit: 34, step: 28000 },
    { min: 120, max: 130, baseFee: 10400, baseVisit: 36, step: 30000 },
    { min: 130, max: 140, baseFee: 10800, baseVisit: 38, step: 32000 },
    { min: 140, max: 150, baseFee: 11200, baseVisit: 40, step: 34000 },
    { min: 150, max: 160, baseFee: 11600, baseVisit: 42, step: 36000 },
    { min: 160, max: 170, baseFee: 12000, baseVisit: 44, step: 38000 },
    { min: 170, max: 180, baseFee: 12400, baseVisit: 46, step: 40000 },
    { min: 180, max: 190, baseFee: 12800, baseVisit: 48, step: 42000 },
    { min: 190, max: 200, baseFee: 13200, baseVisit: 50, step: 44000 },
  ];

  // 2. 找到对应面积的配置（60-200平）
  let cfg = areaConfigs.find(
    (item) => actualArea >= item.min && actualArea < item.max,
  );
  
  // 3. 规则3：如果超过200平，使用200平的配置，并按照规则递增计算超出部分
  // 每增加10平：基础费用+400，基础上门次数+2，step+2000
  if (!cfg) {
    const baseConfig = areaConfigs[areaConfigs.length - 1]; // 190-200的配置（作为200平的基准）
    const extraArea = actualArea - 200; // 超出200平的部分
    const extraUnits = Math.floor(extraArea / 10); // 超出多少个10平单位
    cfg = {
      ...baseConfig,
      baseFee: baseConfig.baseFee + extraUnits * 400,
      baseVisit: baseConfig.baseVisit + extraUnits * 2,
      step: baseConfig.step + extraUnits * 2000,
    };
  }

  // 3. 计算施工费用档位（每档跨度与表格一致）
  //   第一档：0 - step
  //   第二档：step - 1.35*step
  //   第三档：1.35*step - 1.7*step
  //   第四档：以上
  const step1 = cfg.step;
  const step2 = step1 * 1.35;
  const step3 = step1 * 1.7;

  let level = 0; // 第几档（0~3）
  if (cost <= step1) {
    level = 0;
  } else if (cost <= step2) {
    level = 1;
  } else if (cost <= step3) {
    level = 2;
  } else {
    level = 3; // 最高档
  }

  // 4. 工长费用 = 基础工长费 + 档位 * 1000
  const foremanFee = cfg.baseFee + level * 1000;

  // 5. 上门次数 = 基础上门次数 + 档位 * 3
  const visits = cfg.baseVisit + level * 3;

  return { foremanFee, visits };
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
    private readonly walletService: WalletService,
    private readonly walletTransactionService: WalletTransactionService,
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
        order: this.normalizeOrderWorkPrices(fullOrder || savedOrder),
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

      return this.normalizeOrderWorkPrices(updatedOrder);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('接单失败:', error);
      throw new HttpException('接单失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 指派订单给工匠（管理员操作）
   * @param orderId 订单ID
   * @param craftsmanUserId 工匠用户ID
   * @returns 更新后的订单
   */
  async assignOrder(
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

      // 2. 检查订单状态（只有待接单的订单才能被指派）
      if (order.order_status !== OrderStatus.PENDING) {
        throw new HttpException(
          `订单状态为${order.order_status_name}，无法指派`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // 3. 验证工匠是否存在
      const craftsman = await this.craftsmanUserRepository.findOne({
        where: { id: craftsmanUserId },
      });

      if (!craftsman) {
        throw new HttpException('工匠不存在', HttpStatus.NOT_FOUND);
      }

      // 4. 更新订单状态和指派工匠
      order.order_status = OrderStatus.ACCEPTED;
      order.order_status_name = ORDER_STATUS_MAP[OrderStatus.ACCEPTED];
      order.craftsman_user_id = craftsmanUserId;

      const updatedOrder = await this.orderRepository.save(order);

      // 5. 加载完整的订单信息（包含关联信息）
      const fullOrder = await this.findOne(updatedOrder.id);

      return fullOrder;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('指派订单失败:', error);
      throw new HttpException(
        '指派订单失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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

      return this.normalizeOrderWorkPrices(updatedOrder);
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
   * 取消订单
   * @param cancelOrderDto 取消订单信息
   * @returns 更新后的订单
   */
  async cancelOrder(cancelOrderDto: CancelOrderDto): Promise<Order> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: cancelOrderDto.orderId },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 检查订单状态是否允许取消
      if (order.order_status === OrderStatus.COMPLETED) {
        throw new HttpException('已完成订单不能取消', HttpStatus.BAD_REQUEST);
      }

      if (order.order_status === OrderStatus.CANCELLED) {
        throw new HttpException('订单已取消', HttpStatus.BAD_REQUEST);
      }

      // 更新订单状态为已取消
      order.order_status = OrderStatus.CANCELLED;
      order.order_status_name = ORDER_STATUS_MAP[OrderStatus.CANCELLED];

      const updatedOrder = await this.orderRepository.save(order);

      return this.normalizeOrderWorkPrices(updatedOrder);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('取消订单失败:', error);
      throw new HttpException(
        '取消订单失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 标准化订单的 work_prices 数据，确保所有必需字段都存在
   * @param order 订单对象
   * @returns 标准化后的订单对象
   */
  private normalizeOrderWorkPrices(order: Order): Order {
    if (order.work_prices && Array.isArray(order.work_prices)) {
      order.work_prices = order.work_prices.map((workPrice) => ({
        ...workPrice,
        // 确保新字段存在
        visiting_service_num:
          workPrice.visiting_service_num !== undefined
            ? workPrice.visiting_service_num
            : 0,
        total_is_accepted:
          workPrice.total_is_accepted !== undefined
            ? workPrice.total_is_accepted
            : false,
        total_price:
          workPrice.total_price !== undefined ? workPrice.total_price : 0,
        area: workPrice.area !== undefined ? workPrice.area : 0,
        total_service_fee:
          workPrice.total_service_fee !== undefined
            ? workPrice.total_service_fee
            : 0,
        craftsman_user_work_kind_name:
          workPrice.craftsman_user_work_kind_name !== undefined
            ? workPrice.craftsman_user_work_kind_name
            : '',
        is_paid: workPrice.is_paid !== undefined ? workPrice.is_paid : false,
        gangmaster_cost:
          workPrice.gangmaster_cost !== undefined
            ? workPrice.gangmaster_cost
            : undefined,
        // 确保 prices_list 中的验收字段存在（如果需要）
        prices_list: workPrice.prices_list?.map((item) => {
          const workKindName = item.work_kind?.work_kind_name || '';
          const isForeman =
            workPrice.craftsman_user_work_kind_name === '工长';
          // 水电和泥瓦工需要验收
          const needsAcceptance = isForeman && (workKindName === '水电' || workKindName === '泥瓦工');

          const processedItem: any = { ...item };
          // 统一使用 is_accepted 字段
          if (needsAcceptance && processedItem.is_accepted === undefined) {
            processedItem.is_accepted = false;
          }
          return processedItem;
        }) || [],
      }));
    }

    // 标准化 sub_work_prices
    if (order.sub_work_prices && Array.isArray(order.sub_work_prices)) {
      order.sub_work_prices = order.sub_work_prices.map((workPrice) => ({
        ...workPrice,
        // 确保新字段存在
        visiting_service_num:
          workPrice.visiting_service_num !== undefined
            ? workPrice.visiting_service_num
            : 0,
        total_is_accepted:
          workPrice.total_is_accepted !== undefined
            ? workPrice.total_is_accepted
            : false,
        total_price:
          workPrice.total_price !== undefined ? workPrice.total_price : 0,
        area: workPrice.area !== undefined ? workPrice.area : 0,
        total_service_fee:
          workPrice.total_service_fee !== undefined
            ? workPrice.total_service_fee
            : 0,
        craftsman_user_work_kind_name:
          workPrice.craftsman_user_work_kind_name !== undefined
            ? workPrice.craftsman_user_work_kind_name
            : '',
        is_paid: workPrice.is_paid !== undefined ? workPrice.is_paid : false,
        // 子工价单不包含验收字段
        prices_list: workPrice.prices_list || [],
      }));
    }


    return order;
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

    return this.normalizeOrderWorkPrices(order);
  }

  /**
   * 获取用户的订单列表
   * @param wechatUserId 微信用户ID
   * @returns 订单列表
   */
  async getUserOrders(wechatUserId: number): Promise<Order[]> {
    const orders = await this.orderRepository.find({
      where: { wechat_user_id: wechatUserId },
      relations: ['wechat_user', 'craftsman_user'],
      order: { createdAt: 'DESC' },
    });
    return orders.map((order) => this.normalizeOrderWorkPrices(order));
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

    return matchedPendingOrders.map((order) =>
      this.normalizeOrderWorkPrices(order),
    );
  }

  /**
   * 获取工匠已接单的订单列表
   * @param craftsmanUserId 工匠用户ID
   * @returns 已接单的订单列表
   */
  async getAcceptedCraftsmanOrders(craftsmanUserId: number): Promise<Order[]> {
    const orders = await this.orderRepository.find({
      where: { craftsman_user_id: craftsmanUserId },
      relations: ['wechat_user', 'craftsman_user'],
      order: { createdAt: 'DESC' },
    });
    return orders.map((order) => this.normalizeOrderWorkPrices(order));
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

    return uniqueOrders.map((order) => this.normalizeOrderWorkPrices(order));
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
      area: number | string;
      craftsman_user_work_kind_name: string;
      prices_list: Array<{
        id: number;
        quantity: number;
        work_kind: {
          id: number;
          work_kind_name: string;
        };
        work_price: string;
        work_title: string;
        labour_cost: {
          id: number;
          labour_cost_name: string;
        };
        work_kind_id: number;
        minimum_price: string;
        is_set_minimum_price: string;
      }>;
      total_service_fee?: number;
      visiting_service_num?: number;
      is_paid?: boolean;
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

      // 4. 判断是添加到 work_prices 还是 sub_work_prices
      const isSubWorkPrice =
        order.work_prices && order.work_prices.length > 0;

      // 5. 初始化数组（如果不存在）
      if (!isSubWorkPrice) {
        if (!order.work_prices) {
          order.work_prices = [];
        }
      } else {
        if (!order.sub_work_prices) {
          order.sub_work_prices = [];
        }
      }

      // 6. 遍历 workPrices 数组，添加每个工价项
      workPrices.forEach((workPriceItem) => {
        const isForeman =
          workPriceItem.craftsman_user_work_kind_name === '工长';
        const area = Number(workPriceItem.area) || 0;
        const constructionCost = workPriceItem.total_price; // 施工费用

        let processedPricesList: any[];
        let finalTotalPrice: number;
        let foremanFee = 0; // 工长工费
        let visitingServiceNum = 0; // 上门服务次数
        let totalServiceFee: number;

        if (isSubWorkPrice) {
          // 子工价单逻辑：不收取工长费用，没有水电确认
          // 处理 prices_list，不添加验收字段
          processedPricesList = workPriceItem.prices_list.map(
            (priceItem) => ({ ...priceItem }),
          );

          // 子工价单：total_price = 施工费用，不包含工长费用
          finalTotalPrice = constructionCost;

          // 子工价单：平台服务费 = 施工费用 * 10%
          totalServiceFee = constructionCost * 0.1;
        } else {
          // 主工价单逻辑
          // 处理 prices_list，为"水电"或"泥瓦工"添加验收字段（由后端自动管理）
          processedPricesList = workPriceItem.prices_list.map(
            (priceItem) => {
              const workKindName =
                priceItem.work_kind?.work_kind_name || '';
              // 水电和泥瓦工需要验收
              const needsAcceptance = isForeman && (workKindName === '水电' || workKindName === '泥瓦工');

              const processedItem: any = { ...priceItem };
              // 统一使用 is_accepted 字段
              if (needsAcceptance) {
                processedItem.is_accepted = false;
              }
              return processedItem;
            },
          );

          finalTotalPrice = constructionCost; // 最终总价（施工费用，不包含工长费用）

          if (isForeman) {
            // 工长逻辑
            // 1. 判断 prices_list 中是否有"水电"或"泥瓦工"
            const hasShuiDianOrNiWa =
              processedPricesList.some(
                (item) =>
                  item.work_kind?.work_kind_name === '水电' ||
                  item.work_kind?.work_kind_name === '泥瓦工',
              );

            if (hasShuiDianOrNiWa) {
              // 2. 计算工长工费和上门次数
              const foremanResult = calcForeman(area, constructionCost);
              foremanFee = foremanResult.foremanFee;
              visitingServiceNum = foremanResult.visits;

              // 3. total_price 不包含工长费用，工长费用单独存储到 gangmaster_cost
              finalTotalPrice = constructionCost;

              // 4. 平台服务费只按照施工费用的10%来收取，不包含工长费用
              totalServiceFee = constructionCost * 0.1;
            } else {
              // 如果没有"水电"或"泥瓦工"，按照普通工匠逻辑处理
              totalServiceFee = constructionCost * 0.1;
            }
          } else {
            // 其他工匠逻辑：直接计算 total_price 和平台服务费
            totalServiceFee = constructionCost * 0.1;
          }
        }

        // total_is_accepted 由后端自动管理，默认为 false
        const total_is_accepted = false;

        // 使用传入的 is_paid，如果没有则默认为 false
        const is_paid =
          workPriceItem.is_paid !== undefined
            ? workPriceItem.is_paid
            : false;

        const workPriceData: any = {
          visiting_service_num: visitingServiceNum,
          total_is_accepted: total_is_accepted,
          total_price: finalTotalPrice,
          area: workPriceItem.area,
          total_service_fee: totalServiceFee,
          craftsman_user_work_kind_name:
            workPriceItem.craftsman_user_work_kind_name,
          is_paid: is_paid,
          prices_list: processedPricesList,
        };

        // 如果是工长且有工长费用，将工长费用存储到 gangmaster_cost
        if (isForeman && foremanFee > 0) {
          workPriceData.gangmaster_cost = foremanFee;
        }

        // 根据是否是子工价单，添加到不同的数组
        if (isSubWorkPrice) {
          order.sub_work_prices.push(workPriceData);
        } else {
          order.work_prices.push(workPriceData);
        }
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

  /**
   * 分页查询订单
   * @param queryDto 查询参数
   * @returns 分页结果
   */
  async getOrdersByPage(queryDto: QueryOrderDto): Promise<any> {
    try {
      // 获取参数
      const {
        pageIndex = 1,
        pageSize = 10,
        craftsman_user_name = '',
        wechat_user_name = '',
        work_kind_name = '',
        date_range = [],
      } = queryDto;

      // 创建查询构建器，关联用户表
      const query = this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.wechat_user', 'wechat_user')
        .leftJoinAndSelect('order.craftsman_user', 'craftsman_user');

      // 添加筛选条件：工匠用户名
      if (craftsman_user_name) {
        query.andWhere('craftsman_user.nickname LIKE :craftsman_user_name', {
          craftsman_user_name: `%${craftsman_user_name}%`,
        });
      }

      // 添加筛选条件：微信用户名
      if (wechat_user_name) {
        query.andWhere('wechat_user.nickname LIKE :wechat_user_name', {
          wechat_user_name: `%${wechat_user_name}%`,
        });
      }

      // 添加筛选条件：工种名称（查询订单表中的 work_kind_name 字段）
      if (work_kind_name) {
        query.andWhere('order.work_kind_name LIKE :work_kind_name', {
          work_kind_name: `%${work_kind_name}%`,
        });
      }

      // 日期范围筛选
      if (date_range && Array.isArray(date_range) && date_range.length === 2) {
        const [startDate, endDate] = date_range;
        
        // 验证日期格式
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        
        if (startDate) {
          if (!dateRegex.test(startDate)) {
            throw new BadRequestException(
              '开始日期格式错误，请使用 YYYY-MM-DD 格式',
            );
          }
          const start = new Date(startDate + ' 00:00:00');
          query.andWhere('order.createdAt >= :startDate', { startDate: start });
        }
        
        if (endDate) {
          if (!dateRegex.test(endDate)) {
            throw new BadRequestException(
              '结束日期格式错误，请使用 YYYY-MM-DD 格式',
            );
          }
          const end = new Date(endDate + ' 23:59:59');
          query.andWhere('order.createdAt <= :endDate', { endDate: end });
        }
      }

      // 按创建时间倒序排列
      query.orderBy('order.createdAt', 'DESC');

      // 查询总数
      const total = await query.getCount();

      // 查询数据（分页）
      const data = await query
        .skip((pageIndex - 1) * pageSize)
        .take(pageSize)
        .getMany();

      // 标准化订单数据
      const normalizedData = data.map((order) =>
        this.normalizeOrderWorkPrices(order),
      );

      // 返回结果（包含分页信息的完整格式）
      return {
        success: true,
        data: normalizedData,
        code: 200,
        message: null,
        pageIndex,
        pageSize,
        total,
        pageTotal: Math.ceil(total / pageSize),
      };
    } catch (error) {
      console.error('分页查询订单错误:', error);
      if (error instanceof BadRequestException || error instanceof HttpException) {
        throw error;
      }
      return {
        success: false,
        data: null,
        code: 500,
        message: '分页查询失败: ' + error.message,
        pageIndex: 1,
        pageSize: 10,
        total: 0,
        pageTotal: 0,
      };
    }
  }

  /**
   * 确认支付
   * @param confirmPaymentDto 确认支付信息
   * @returns null，由全局拦截器包装成标准响应
   */
  async confirmPayment(
    confirmPaymentDto: ConfirmPaymentDto,
  ): Promise<null> {
    try {
      const { order_id, pay_type, subItem } = confirmPaymentDto;

      // 1. 查找订单
      const order = await this.orderRepository.findOne({
        where: { id: order_id },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 根据支付类型处理
      if (pay_type === 'work_prices') {
        // 检查 work_prices 是否存在且有数据
        if (!order.work_prices || !Array.isArray(order.work_prices) || order.work_prices.length === 0) {
          throw new HttpException(
            '订单工价列表为空，无法确认支付',
            HttpStatus.BAD_REQUEST,
          );
        }

        // 将 work_prices 数组中第0项的 is_paid 设置为 true
        order.work_prices[0].is_paid = true;

        // 保存订单
        await this.orderRepository.save(order);

        // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
        return null;
      } else if (pay_type === 'sub_work_prices') {
        // 检查 subItem 参数是否存在
        if (subItem === undefined || subItem === null) {
          throw new HttpException(
            '子工价索引不能为空',
            HttpStatus.BAD_REQUEST,
          );
        }

        // 检查 sub_work_prices 是否存在且有数据
        if (!order.sub_work_prices || !Array.isArray(order.sub_work_prices) || order.sub_work_prices.length === 0) {
          throw new HttpException(
            '订单子工价列表为空，无法确认支付',
            HttpStatus.BAD_REQUEST,
          );
        }

        // 检查索引是否有效
        if (subItem < 0 || subItem >= order.sub_work_prices.length) {
          throw new HttpException(
            `子工价索引 ${subItem} 超出范围，当前子工价列表长度为 ${order.sub_work_prices.length}`,
            HttpStatus.BAD_REQUEST,
          );
        }

        // 将 sub_work_prices 数组中指定索引项的 is_paid 设置为 true
        order.sub_work_prices[subItem].is_paid = true;

        // 保存订单
        await this.orderRepository.save(order);

        // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
        return null;
      } else {
        throw new HttpException(
          `不支持的支付类型: ${pay_type}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('确认支付失败:', error);
      throw new HttpException(
        '确认支付失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 验收工价
   * @param acceptWorkPriceDto 验收信息
   * @returns null，由全局拦截器包装成标准响应
   */
  async acceptWorkPrice(
    acceptWorkPriceDto: AcceptWorkPriceDto,
  ): Promise<null> {
    try {
      const { order_id, accepted_type, prices_item } = acceptWorkPriceDto;

      // 1. 查找订单
      const order = await this.orderRepository.findOne({
        where: { id: order_id },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 验证订单是否有接单的工匠
      if (!order.craftsman_user_id) {
        throw new HttpException(
          '订单尚未接单，无法验收',
          HttpStatus.BAD_REQUEST,
        );
      }

      const craftsmanUserId = order.craftsman_user_id;

      // 3. 获取工匠信息，判断是否是工长
      const craftsman = await this.craftsmanUserRepository.findOne({
        where: { id: craftsmanUserId },
      });

      if (!craftsman) {
        throw new HttpException('工匠不存在', HttpStatus.NOT_FOUND);
      }

      // 4. 根据验收类型处理
      if (accepted_type === 'work_prices') {
        // 处理主工价单
        if (!order.work_prices || order.work_prices.length === 0) {
          throw new HttpException(
            '订单工价列表为空，无法验收',
            HttpStatus.BAD_REQUEST,
          );
        }

        const workPrice = order.work_prices[0];
        const isForeman =
          workPrice.craftsman_user_work_kind_name === '工长';

        // 检查是否已付款
        if (workPrice.is_paid !== true) {
          throw new HttpException(
            '订单尚未付款，请联系平台付款',
            HttpStatus.BAD_REQUEST,
          );
        }

        if (prices_item !== undefined && prices_item !== null) {
          // 情况2：验收单个工价项（仅工长）
          if (!isForeman) {
            throw new HttpException(
              '非工长无法进行单项验收',
              HttpStatus.BAD_REQUEST,
            );
          }

          // 验证索引是否有效
          if (
            prices_item < 0 ||
            prices_item >= workPrice.prices_list.length
          ) {
            throw new HttpException(
              `工价项索引 ${prices_item} 超出范围`,
              HttpStatus.BAD_REQUEST,
            );
          }

          // 检查该项是否已经被验收过
          const priceItem = workPrice.prices_list[prices_item];
          const alreadyAccepted = priceItem.is_accepted === true;

          // 如果已经验收过，直接返回，不进行任何操作
          if (alreadyAccepted) {
            throw new HttpException(
              `工价项索引 ${prices_item} 已经验收过，无法重复验收`,
              HttpStatus.BAD_REQUEST,
            );
          }

          // 设置对应项的 is_accepted 为 true
          priceItem.is_accepted = true;

          // 工长工费的25%打入钱包
          const gangmasterCost = workPrice.gangmaster_cost || 0;
          if (gangmasterCost > 0) {
            const amount = gangmasterCost * 0.25;
            console.log(
              `验收单项 ${prices_item}，打款工长费用25%: ${amount}`,
            );
            await this.walletService.addBalance(craftsmanUserId, amount);
            
            // 创建账户明细：订单逻辑验收中（收入）
            try {
              await this.walletTransactionService.create({
                craftsman_user_id: craftsmanUserId,
                amount,
                type: WalletTransactionType.INCOME,
                description: '订单验收',
                order_id: order_id.toString(),
              });
            } catch (error) {
              console.error('创建账户明细失败:', error);
              // 不影响验收流程，只记录错误
            }
          }
        } else {
          // 情况1：验收整个工价单
          // 设置 total_is_accepted 为 true
          workPrice.total_is_accepted = true;

          // 将所有 prices_list 中的 is_accepted 设置为 true
          if (workPrice.prices_list && workPrice.prices_list.length > 0) {
            workPrice.prices_list.forEach((item: any) => {
              if (item.is_accepted !== undefined) {
                item.is_accepted = true;
              }
            });
          }

          if (isForeman) {
            // 工长逻辑
            const gangmasterCost = workPrice.gangmaster_cost || 0;
            if (gangmasterCost > 0) {
              // 计算已经验收的单项数量（水电或泥瓦工），每个单项打款25%
              const acceptedItems = workPrice.prices_list?.filter(
                (item: any) =>
                  (item.work_kind?.work_kind_name === '水电' ||
                    item.work_kind?.work_kind_name === '泥瓦工') &&
                  item.is_accepted === true,
              ) || [];

              // 计算已经支付的工长费用（每个单项25%）
              const paidAmount = acceptedItems.length * gangmasterCost * 0.25;

              // 剩余需要支付的工长费用（75%）
              const remainingAmount = gangmasterCost - paidAmount;

              if (remainingAmount > 0) {
                // 获取当前钱包信息
                const wallet = await this.walletService.getWallet(craftsmanUserId);
                const currentFreezeMoney = Number(wallet.freeze_money) || 0;
                const targetFreezeMoney = 5000; // 目标冻结金额

                let freezeAmount = 0;
                let balanceAmount = remainingAmount;

                // 如果当前冻结金额未达到目标，则扣除
                if (currentFreezeMoney < targetFreezeMoney) {
                  const needFreeze = targetFreezeMoney - currentFreezeMoney;
                  freezeAmount = Math.min(needFreeze, 1000); // 每次最多扣除1000
                  balanceAmount = remainingAmount - freezeAmount;
                }

                // 更新钱包
                if (freezeAmount > 0 || balanceAmount > 0) {
                  await this.walletService.addBalanceAndFreeze(
                    craftsmanUserId,
                    balanceAmount,
                    freezeAmount,
                  );
                  
                  // 创建账户明细：订单逻辑验收中（收入）
                  // 记录总收入 = balanceAmount + freezeAmount（包括余额和质保金冻结）
                  const totalAmount = balanceAmount + freezeAmount;
                  try {
                    await this.walletTransactionService.create({
                      craftsman_user_id: craftsmanUserId,
                      amount: totalAmount,
                      type: WalletTransactionType.INCOME,
                      description: '订单验收',
                      order_id: order_id.toString(),
                    });
                  } catch (error) {
                    console.error('创建账户明细失败:', error);
                    // 不影响验收流程，只记录错误
                  }
                }
              }
            }

            // 订单状态设置为已完成
            order.order_status = OrderStatus.COMPLETED;
            order.order_status_name = ORDER_STATUS_MAP[OrderStatus.COMPLETED];
          } else {
            // 非工长逻辑
            const totalPrice = workPrice.total_price || 0;
            if (totalPrice > 0) {
              // 获取当前钱包信息
              const wallet = await this.walletService.getWallet(craftsmanUserId);
              const currentFreezeMoney = Number(wallet.freeze_money) || 0;
              const targetFreezeMoney = 3000; // 目标冻结金额

              let freezeAmount = 0;
              let balanceAmount = totalPrice;

              // 如果当前冻结金额未达到目标，则扣除
              if (currentFreezeMoney < targetFreezeMoney) {
                const needFreeze = targetFreezeMoney - currentFreezeMoney;
                freezeAmount = Math.min(needFreeze, 600); // 每次最多扣除600
                balanceAmount = totalPrice - freezeAmount;
              }

              // 更新钱包
              if (freezeAmount > 0 || balanceAmount > 0) {
                await this.walletService.addBalanceAndFreeze(
                  craftsmanUserId,
                  balanceAmount,
                  freezeAmount,
                );
                
                // 创建账户明细：订单逻辑验收中（收入）
                // 记录总收入 = balanceAmount + freezeAmount（包括余额和质保金冻结）
                const totalAmount = balanceAmount + freezeAmount;
                try {
                  await this.walletTransactionService.create({
                    craftsman_user_id: craftsmanUserId,
                    amount: totalAmount,
                    type: WalletTransactionType.INCOME,
                    description: '订单验收',
                    order_id: order_id.toString(),
                  });
                } catch (error) {
                  console.error('创建账户明细失败:', error);
                  // 不影响验收流程，只记录错误
                }
              }
            }

            // 订单状态设置为已完成
            order.order_status = OrderStatus.COMPLETED;
            order.order_status_name = ORDER_STATUS_MAP[OrderStatus.COMPLETED];
          }
        }
      } else if (accepted_type === 'sub_work_prices') {
        // 处理子工价单
        if (!order.sub_work_prices || order.sub_work_prices.length === 0) {
          throw new HttpException(
            '订单子工价列表为空，无法验收',
            HttpStatus.BAD_REQUEST,
          );
        }

        // prices_item 必须传递
        if (prices_item === undefined || prices_item === null) {
          throw new HttpException(
            '验收子工价单时，prices_item 参数必须传递',
            HttpStatus.BAD_REQUEST,
          );
        }

        // 验证索引是否有效
        if (
          prices_item < 0 ||
          prices_item >= order.sub_work_prices.length
        ) {
          throw new HttpException(
            `子工价单索引 ${prices_item} 超出范围`,
            HttpStatus.BAD_REQUEST,
          );
        }

        const subWorkPrice = order.sub_work_prices[prices_item];

        // 检查是否已付款
        if (subWorkPrice.is_paid !== true) {
          throw new HttpException(
            '订单尚未付款，请联系平台付款',
            HttpStatus.BAD_REQUEST,
          );
        }

        // 检查是否已经验收过
        if (subWorkPrice.total_is_accepted === true) {
          throw new HttpException(
            `子工价单索引 ${prices_item} 已经验收过，无法重复验收`,
            HttpStatus.BAD_REQUEST,
          );
        }

        // 设置验收状态
        subWorkPrice.total_is_accepted = true;

        // 将该子工价单的 total_price 直接打入 balance
        const totalPrice = subWorkPrice.total_price || 0;
        if (totalPrice > 0) {
          console.log(
            `验收子工价单 ${prices_item}，打款金额: ${totalPrice}`,
          );
          await this.walletService.addBalance(craftsmanUserId, totalPrice);
          
          // 创建账户明细：订单逻辑验收中（收入）
          try {
            await this.walletTransactionService.create({
              craftsman_user_id: craftsmanUserId,
              amount: totalPrice,
              type: WalletTransactionType.INCOME,
              description: '订单验收',
              order_id: order_id.toString(),
            });
          } catch (error) {
            console.error('创建账户明细失败:', error);
            // 不影响验收流程，只记录错误
          }
        }

        // 注意：子工价单验收不会完成订单，只有 work_prices[0] 的 total_is_accepted 验收才会完成订单
      } else {
        throw new HttpException(
          `不支持的验收类型: ${accepted_type}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // 5. 保存订单
      await this.orderRepository.save(order);

      // 6. 返回null，全局拦截器会自动包装成标准响应
      return null;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('验收工价失败:', error);
      throw new HttpException(
        '验收工价失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

}

