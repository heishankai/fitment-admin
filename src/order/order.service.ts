import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';
import { IsSkillVerified } from '../is-skill-verified/is-skill-verified.entity';
import { WechatUser } from '../wechat-user/wechat-user.entity';
import { WorkPriceItem } from '../work-price-item/work-price-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { AcceptWorkPriceDto } from './dto/accept-work-price.dto';
import { AcceptSingleWorkPriceDto } from './dto/accept-single-work-price.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ConfirmWorkPriceServiceFeeDto } from './dto/confirm-work-price-service-fee.dto';
import { ORDER_MATCH_CONFIG } from '../common/constants/app.constants';
import { BadRequestException } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';
import { WalletTransactionService } from '../wallet-transaction/wallet-transaction.service';
import { WalletTransactionType } from '../wallet-transaction/wallet-transaction.entity';
import { PlatformIncomeRecordService } from '../platform-income-record/platform-income-record.service';
import { CostType } from '../platform-income-record/platform-income-record.entity';

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

/**
 * 生成订单号
 * 格式：[业务前缀][时间戳][当日递增序列]
 * 例如：GM20250308152330000123、CM20250308152330000456
 * @param orderType 订单类型：'gangmaster' 或 'craftsman'
 * @param orderRepository 订单仓库（用于查询当日订单数量）
 * @returns 订单号
 */
async function generateOrderNo(
  orderType: 'gangmaster' | 'craftsman',
  orderRepository: Repository<Order>,
): Promise<string> {
  // 1. 确定业务前缀
  const prefix = orderType === 'gangmaster' ? 'GM' : 'CM';

  // 2. 获取当前时间戳（格式：YYYYMMDDHHmmss）
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;

  // 3. 查询当日同类型订单数量（用于生成递增序列）
  const startOfDay = new Date(year, now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(year, now.getMonth(), now.getDate(), 23, 59, 59);

  const todayOrdersCount = await orderRepository
    .createQueryBuilder('order')
    .where('order.order_type = :orderType', { orderType })
    .andWhere('order.createdAt >= :startOfDay', { startOfDay })
    .andWhere('order.createdAt <= :endOfDay', { endOfDay })
    .getCount();

  // 4. 生成递增序列（6位数字，从1开始）
  const sequence = String(todayOrdersCount + 1).padStart(6, '0');

  // 5. 组合订单号
  return `${prefix}${timestamp}${sequence}`;
}

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
    @InjectRepository(WorkPriceItem)
    private readonly workPriceItemRepository: Repository<WorkPriceItem>,
    private readonly walletService: WalletService,
    private readonly walletTransactionService: WalletTransactionService,
    private readonly platformIncomeRecordService: PlatformIncomeRecordService,
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

      // 2. 根据 work_kind_name 判断订单类型
      // 如果工种名称是"工长"，则为工长订单，否则为工匠订单
      const orderType = createOrderDto.work_kind_name === '工长' ? 'gangmaster' : 'craftsman';

      // 3. 根据 houseType 设置 houseTypeName
      let houseTypeName: string | null = null;
      if (createOrderDto.houseType === 'new') {
        houseTypeName = '新房';
      } else if (createOrderDto.houseType === 'old') {
        houseTypeName = '老房';
      }

      // 4. 生成订单号
      const orderNo = await generateOrderNo(orderType, this.orderRepository);

      console.log('创建订单 - 设置字段:', {
        orderType,
        orderNo,
        houseTypeName,
        work_kind_name: createOrderDto.work_kind_name,
        houseType: createOrderDto.houseType,
      });

      // 5. 创建订单（确保 order_no、order_type、houseTypeName 在最后设置，避免被覆盖）
      const order = this.orderRepository.create({
        ...createOrderDto,
        wechat_user_id: wechatUserId,
        order_status: OrderStatus.PENDING,
        order_status_name: ORDER_STATUS_MAP[OrderStatus.PENDING],
        order_type: orderType, // 订单类型
        order_no: orderNo, // 订单号
        houseTypeName: houseTypeName, // 房屋类型名称
      });

      const savedOrder = await this.orderRepository.save(order);
      
      console.log('订单保存后 - 检查字段:', {
        id: savedOrder.id,
        order_no: savedOrder.order_no,
        order_type: savedOrder.order_type,
        houseTypeName: savedOrder.houseTypeName,
      });

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
          // 水电和泥工需要验收
          const needsAcceptance = isForeman && (workKindName === '水电' || workKindName === '泥工');

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
   * 根据ID获取订单（包含关联信息和父工价列表）
   * @param orderId 订单ID
   * @returns 订单信息（包含父工价列表和统计信息）
   */
  async findOne(orderId: number): Promise<any> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['wechat_user', 'craftsman_user'],
    });

    if (!order) {
      throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
    }

    let allWorkItems: WorkPriceItem[];

    // 如果是分配出去的订单，从父订单查询分配给该工匠的工价项
    if (order.parent_order_id && order.craftsman_user_id) {
      // 查询父订单中分配给该工匠的所有工价项（包括主工价和子工价）
      allWorkItems = await this.workPriceItemRepository.find({
        where: {
          order_id: order.parent_order_id,
          assigned_craftsman_id: order.craftsman_user_id,
        },
        relations: ['assigned_craftsman'],
        order: { createdAt: 'ASC' },
      });
    } else {
      // 普通订单，查询该订单的所有工价项
      allWorkItems = await this.workPriceItemRepository.find({
      where: { order_id: orderId },
      relations: ['assigned_craftsman'],
      order: { createdAt: 'ASC' },
    });
    }

    // 查询主工价组（work_group_id = 1 或 null 的工价项）
    // 对于分配订单：
    // - 如果分配的是主工价，父订单的工价项 work_group_id = 1
    // - 如果分配的是子工价，父订单的工价项 work_group_id > 1，但在分配订单中显示时应该作为主工价项处理
    // 所以对于分配订单，返回所有分配给该工匠的工价项（无论 work_group_id 是多少）
    // 对于普通订单，只返回主工价组（work_group_id = 1 或 null）
    const mainWorkItems = order.parent_order_id && order.craftsman_user_id
      ? allWorkItems // 分配订单：返回所有分配给该工匠的工价项
      : allWorkItems.filter((item) => !item.work_group_id || item.work_group_id === 1); // 普通订单：只返回主工价组

    // 计算主工价组的统计信息（如果存在主工价组）
    let total_price = 0;
    let total_is_accepted = false;
    let is_paid = false;

    if (mainWorkItems.length > 0) {
      // total_price: 施工费用（不包含工长费用，只计算主工价组（work_group_id = 1）的 settlement_amount 之和）
      // 注意：总是重新计算 settlement_amount，确保考虑最低价格逻辑正确
      total_price = mainWorkItems.reduce((sum, item) => {
        // 重新计算 settlement_amount（考虑最低价格），确保计算正确
        const settlementAmount = item.calculateSettlementAmount();
        return sum + settlementAmount;
      }, 0);

      // total_is_accepted: 整组工价列表的总验收状态（只检查主工价组，不包括子工价组）
      // 全部为true就为true，否则就为false
      total_is_accepted =
        mainWorkItems.length > 0 &&
        mainWorkItems.every((item) => item.is_accepted === true);

      // is_paid: 用户是否已付款（只检查主工价组，不包括子工价组）
      // 全部为true就为true，否则就为false
      is_paid =
        mainWorkItems.length > 0 &&
        mainWorkItems.every((item) => item.is_paid === true);
    }

    // 按 work_group_id 分组，返回所有工价组
    // 主工价组（work_group_id = 1）作为 parent_work_price_groups 返回
    const parentWorkPriceGroups = mainWorkItems.map((item) => {
      return {
        ...item,
      };
    });

    // 返回订单信息，包含父工价列表和统计信息（在订单级别）
    return {
      ...order,
      parent_work_price_groups: parentWorkPriceGroups,
      // 第一组工价的统计信息（在订单级别返回）
      visiting_service_num: order.visiting_service_num || 0,
      total_service_fee: Number(order.total_service_fee) || 0,
      total_service_fee_is_paid: order.total_service_fee_is_paid || false,
      gangmaster_cost: order.gangmaster_cost || 0,
      total_is_accepted,
      total_price,
      is_paid,
    };
  }

  /**
   * 获取用户的订单列表
   * @param wechatUserId 微信用户ID
   * @returns 订单列表（不包含分配的订单）
   */
  async getUserOrders(wechatUserId: number): Promise<Order[]> {
    const orders = await this.orderRepository.find({
      where: {
        wechat_user_id: wechatUserId,
        is_assigned: false, // 排除分配的订单（工匠订单）
      },
      relations: ['wechat_user', 'craftsman_user'],
      order: { createdAt: 'DESC' },
    });
    return orders.map((order) => this.normalizeOrderWorkPrices(order));
  }

  /**
   * 获取工匠的订单列表（包括匹配到的待接单订单和已分配给该工匠的订单）
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

    // 2. 获取已分配给该工匠的订单（通过 craftsman_user_id）
    const assignedOrders = await this.orderRepository.find({
      where: { craftsman_user_id: craftsmanUserId },
      relations: ['wechat_user', 'craftsman_user'],
      order: { createdAt: 'DESC' },
    });

    // 3. 获取所有待接单的订单（order_status = 1），排除已分配的订单
    const assignedOrderIds = assignedOrders.map((o) => o.id);
    let pendingOrdersQuery = this.orderRepository
      .createQueryBuilder('order')
      .where('order.order_status = :status', { status: OrderStatus.PENDING })
      .leftJoinAndSelect('order.wechat_user', 'wechat_user')
      .orderBy('order.createdAt', 'DESC');

    if (assignedOrderIds.length > 0) {
      pendingOrdersQuery = pendingOrdersQuery.andWhere(
        'order.id NOT IN (:...assignedIds)',
        { assignedIds: assignedOrderIds },
      );
    }

    const pendingOrders = await pendingOrdersQuery.getMany();

    // 4. 过滤出匹配到当前工匠的待接单订单
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

    // 5. 合并已分配的订单和匹配到的待接单订单
    const allOrders = [...assignedOrders, ...matchedPendingOrders];

    console.log(
      `工匠 ${craftsmanUserId} 的订单列表: 已分配订单 ${assignedOrders.length} 个，匹配到的待接单订单 ${matchedPendingOrders.length} 个`,
    );

    return allOrders.map((order) => this.normalizeOrderWorkPrices(order));
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

      // 3. 验证订单状态（只有已接单的订单才能添加工价，已完成和已取消的订单不允许）
      if (order.order_status === OrderStatus.COMPLETED) {
        throw new HttpException(
          '订单已完成，无法添加工价',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (order.order_status === OrderStatus.CANCELLED) {
        throw new HttpException(
          '订单已取消，无法添加工价',
          HttpStatus.BAD_REQUEST,
        );
      }
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
          // 处理 prices_list，为"水电"或"泥工"添加验收字段（由后端自动管理）
          processedPricesList = workPriceItem.prices_list.map(
            (priceItem) => {
              const workKindName =
                priceItem.work_kind?.work_kind_name || '';
              // 水电和泥工需要验收
              const needsAcceptance = isForeman && (workKindName === '水电' || workKindName === '泥工');

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
            // 1. 判断 prices_list 中是否有"水电"或"泥工"
            const hasShuiDianOrNiWa =
              processedPricesList.some(
                (item) =>
                  item.work_kind?.work_kind_name === '水电' ||
                  item.work_kind?.work_kind_name === '泥工',
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
              // 如果没有"水电"或"泥工"，按照普通工匠逻辑处理
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
        order_no = '',
        order_status,
        order_type = '',
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

      // 添加筛选条件：订单号（精确匹配）
      if (order_no) {
        query.andWhere('order.order_no = :order_no', {
          order_no,
        });
      }

      // 添加筛选条件：订单状态（精确匹配）
      if (order_status !== undefined && order_status !== null) {
        query.andWhere('order.order_status = :order_status', {
          order_status,
        });
      }

      // 添加筛选条件：订单类型（精确匹配）
      if (order_type) {
        query.andWhere('order.order_type = :order_type', {
          order_type,
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

      // 2. 检查订单是否已取消
      if (order.order_status === OrderStatus.CANCELLED) {
        throw new HttpException(
          '订单已取消，无法进行支付操作',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 3. 确定要查询的订单ID和工匠ID
      // 如果是分配出去的订单，需要更新父订单中分配给该工匠的工价项
      let targetOrderId = order_id;
      let targetCraftsmanId = order.craftsman_user_id;

      if (order.parent_order_id && order.craftsman_user_id) {
        // 分配订单：更新父订单中分配给该工匠的工价项
        targetOrderId = order.parent_order_id;
        targetCraftsmanId = order.craftsman_user_id;
        console.log(`订单 ${order_id} 是分配订单，将从父订单 ${targetOrderId} 查询分配给工匠 ${targetCraftsmanId} 的工价项`);
      }

      // 4. 查询工价项
      let workPriceItems: WorkPriceItem[];
      if (order.parent_order_id && order.craftsman_user_id) {
        // 分配订单：查询父订单中分配给该工匠的工价项
        workPriceItems = await this.workPriceItemRepository.find({
          where: {
            order_id: targetOrderId,
            assigned_craftsman_id: targetCraftsmanId,
          },
          order: { createdAt: 'ASC' },
        });
      } else {
        // 普通订单：查询该订单的所有工价项
        workPriceItems = await this.workPriceItemRepository.find({
          where: { order_id: targetOrderId },
          order: { createdAt: 'ASC' },
        });
      }

      console.log(`订单 ${order_id} 支付：找到 ${workPriceItems.length} 个工价项`);

      // 5. 根据支付类型处理
      if (pay_type === 'work_prices') {
        // 对于分配订单，返回所有分配给该工匠的工价项（无论 work_group_id 是多少）
        // 对于普通订单，只返回主工价组（work_group_id = 1 或 null）
        const mainWorkItems = order.parent_order_id && order.craftsman_user_id
          ? workPriceItems // 分配订单：返回所有分配给该工匠的工价项
          : workPriceItems.filter((item) => !item.work_group_id || item.work_group_id === 1); // 普通订单：只返回主工价组

        console.log(`订单 ${order_id} 支付：找到 ${mainWorkItems.length} 个主工价项（分配订单：${order.parent_order_id ? '是' : '否'}）`);

        if (mainWorkItems.length === 0) {
          // 兼容旧逻辑：如果没有找到工价项，尝试使用旧的 JSON 字段
        if (!order.work_prices || !Array.isArray(order.work_prices) || order.work_prices.length === 0) {
          throw new HttpException(
            '订单工价列表为空，无法确认支付',
            HttpStatus.BAD_REQUEST,
          );
        }
        order.work_prices[0].is_paid = true;
        await this.orderRepository.save(order);
          return null;
        }

        // 将所有主工价项的 is_paid 设置为 true
        for (const item of mainWorkItems) {
          console.log(`订单 ${order_id} 支付：更新工价项 ${item.id} 的 is_paid 为 true (当前值: ${item.is_paid})`);
          item.is_paid = true;
          const savedItem = await this.workPriceItemRepository.save(item);
          console.log(`订单 ${order_id} 支付：工价项 ${savedItem.id} 保存成功，is_paid: ${savedItem.is_paid}`);
          
          // 验证保存是否成功
          const verifyItem = await this.workPriceItemRepository.findOne({
            where: { id: item.id },
          });
          if (verifyItem && verifyItem.is_paid !== true) {
            console.error(`订单 ${order_id} 支付：工价项 ${item.id} 保存失败，is_paid 仍为 ${verifyItem.is_paid}`);
            throw new HttpException(
              `工价项 ${item.id} 支付状态更新失败`,
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }
        }

        console.log(`订单 ${order_id} 支付：所有主工价项支付状态已更新`);

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

        // 查询子工价组（work_group_id > 1）的工价项，按 work_group_id 分组
        const subWorkGroups = new Map<number, WorkPriceItem[]>();
        workPriceItems.forEach((item) => {
          if (item.work_group_id && item.work_group_id > 1) {
            if (!subWorkGroups.has(item.work_group_id)) {
              subWorkGroups.set(item.work_group_id, []);
            }
            subWorkGroups.get(item.work_group_id)!.push(item);
          }
        });

        const sortedGroupIds = Array.from(subWorkGroups.keys()).sort((a, b) => a - b);

        if (subItem < 0 || subItem >= sortedGroupIds.length) {
          // 兼容旧逻辑：如果没有找到子工价项，尝试使用旧的 JSON 字段
        if (!order.sub_work_prices || !Array.isArray(order.sub_work_prices) || order.sub_work_prices.length === 0) {
          throw new HttpException(
            '订单子工价列表为空，无法确认支付',
            HttpStatus.BAD_REQUEST,
          );
        }
        if (subItem < 0 || subItem >= order.sub_work_prices.length) {
          throw new HttpException(
            `子工价索引 ${subItem} 超出范围，当前子工价列表长度为 ${order.sub_work_prices.length}`,
            HttpStatus.BAD_REQUEST,
          );
        }
        order.sub_work_prices[subItem].is_paid = true;
        await this.orderRepository.save(order);
          return null;
        }

        // 获取指定索引的子工价组
        const targetGroupId = sortedGroupIds[subItem];
        const targetGroupItems = subWorkGroups.get(targetGroupId) || [];

        // 将该子工价组的所有工价项的 is_paid 设置为 true
        for (const item of targetGroupItems) {
          item.is_paid = true;
          await this.workPriceItemRepository.save(item);
        }

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

          // 工长工费的25%打入钱包（验收时不冻结）
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

          // 检查订单是否完成（所有父工价和子工价都已验收）
          const isCompleted = await this.checkOrderCompleted(order_id);
          if (isCompleted) {
            order.order_status = OrderStatus.COMPLETED;
            order.order_status_name = ORDER_STATUS_MAP[OrderStatus.COMPLETED];
            await this.orderRepository.save(order);

            // 订单完成时进行冻结
            await this.handleOrderCompletionFreeze(order);
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
            // 工长逻辑：验收整个工价单时，只标记验收状态，不打款剩余的75%
            // 剩余的75%工长费用只有在订单真正完成（所有工价都验收）时才打款

            // 检查订单是否完成（所有父工价和子工价都已验收）
            const isCompleted = await this.checkOrderCompleted(order_id);
            if (isCompleted) {
              // 订单真正完成时，才打款剩余的75%工长费用
              const gangmasterCost = workPrice.gangmaster_cost || 0;
              if (gangmasterCost > 0) {
                // 计算已经验收的单项数量（水电或泥工），每个单项打款25%
                const acceptedItems = workPrice.prices_list?.filter(
                  (item: any) =>
                    (item.work_kind?.work_kind_name === '水电' ||
                      item.work_kind?.work_kind_name === '泥工') &&
                    item.is_accepted === true,
                ) || [];

                // 计算已经支付的工长费用（每个单项25%）
                const paidAmount = acceptedItems.length * gangmasterCost * 0.25;

                // 剩余需要支付的工长费用（75%）
                const remainingAmount = gangmasterCost - paidAmount;

                if (remainingAmount > 0) {
                  // 订单完成时打款剩余的75%
                  await this.walletService.addBalance(craftsmanUserId, remainingAmount);
                  
                  // 创建账户明细
                  try {
                    await this.walletTransactionService.create({
                      craftsman_user_id: craftsmanUserId,
                      amount: remainingAmount,
                      type: WalletTransactionType.INCOME,
                      description: '订单验收（工长费用剩余）',
                      order_id: order_id.toString(),
                    });
                  } catch (error) {
                    console.error('创建账户明细失败:', error);
                  }
                }
              }

              // 订单状态设置为已完成
              order.order_status = OrderStatus.COMPLETED;
              order.order_status_name = ORDER_STATUS_MAP[OrderStatus.COMPLETED];
              await this.orderRepository.save(order);

              // 订单完成时进行冻结
              await this.handleOrderCompletionFreeze(order);
            } else {
              // 订单未完成，只保存验收状态，不打款剩余的75%
              await this.orderRepository.save(order);
            }
          } else {
            // 非工长逻辑
            const totalPrice = workPrice.total_price || 0;
            if (totalPrice > 0) {
              // 验收时只打款，不冻结
              await this.walletService.addBalance(craftsmanUserId, totalPrice);
              
              // 创建账户明细
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
              }
            }

            // 订单状态设置为已完成
            order.order_status = OrderStatus.COMPLETED;
            order.order_status_name = ORDER_STATUS_MAP[OrderStatus.COMPLETED];
            await this.orderRepository.save(order);

            // 订单完成时进行冻结
            await this.handleOrderCompletionFreeze(order);
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

  /**
   * 将多个工价分配给某个工匠，生成工匠订单
   * @param assignWorkPricesDto 分配工价参数
   * @returns 创建的工匠订单
   */
  async assignWorkPricesToCraftsman(
    assignWorkPricesDto: {
      work_price_list: number[];
      craftsman_id: number;
      parent_order_id: number;
    },
  ): Promise<Order> {
    try {
      const { work_price_list, craftsman_id, parent_order_id } =
        assignWorkPricesDto;

      // 1. 验证父订单是否存在
      const parentOrder = await this.orderRepository.findOne({
        where: { id: parent_order_id },
        relations: ['wechat_user'],
      });

      if (!parentOrder) {
        throw new HttpException('父订单不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 验证工匠是否存在
      const craftsman = await this.craftsmanUserRepository.findOne({
        where: { id: craftsman_id },
      });

      if (!craftsman) {
        throw new HttpException('工匠不存在', HttpStatus.NOT_FOUND);
      }

      // 3. 验证工价项是否存在且属于父订单（支持主工价和子工价）
      const workPriceItems = await this.workPriceItemRepository.find({
        where: {
          id: In(work_price_list),
          order_id: parent_order_id,
        },
      });

      if (workPriceItems.length !== work_price_list.length) {
        throw new HttpException(
          '部分工价项不存在或不属于该订单',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 验证工价项是否已被分配
      const alreadyAssignedItems = workPriceItems.filter(
        (item) => item.assigned_craftsman_id !== null,
      );
      if (alreadyAssignedItems.length > 0) {
        throw new HttpException(
          '部分工价项已被分配给其他工匠',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 检查分配的工价项类型：如果同时包含主工价和子工价，则报错
      const mainWorkItems = workPriceItems.filter(
        (item) => !item.work_group_id || item.work_group_id === 1,
      );
      const subWorkItems = workPriceItems.filter(
        (item) => item.work_group_id && item.work_group_id > 1,
      );

      if (mainWorkItems.length > 0 && subWorkItems.length > 0) {
        throw new HttpException(
          '不能同时分配主工价和子工价，请分别分配',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 4. 检查该工匠是否已经有从该工长订单分配的订单
      const existingCraftsmanOrder = await this.orderRepository.findOne({
        where: {
          parent_order_id: parent_order_id,
          craftsman_user_id: craftsman_id,
          is_assigned: true,
        },
      });

      let savedCraftsmanOrder: Order;

      if (existingCraftsmanOrder) {
        // 如果已存在分配订单，将工价项添加到现有订单
        console.log(`工匠 ${craftsman_id} 已有从工长订单 ${parent_order_id} 分配的订单 ${existingCraftsmanOrder.id}，将工价项添加到现有订单`);
        savedCraftsmanOrder = existingCraftsmanOrder;
      } else {
        // 如果不存在，创建新订单
        // 4.1 生成订单号
        const orderNo = await generateOrderNo('craftsman', this.orderRepository);

        // 4.2 创建工匠订单（复制父订单的基本信息）
        const craftsmanOrder = this.orderRepository.create({
          area: parentOrder.area,
          city: parentOrder.city,
          district: parentOrder.district,
          houseType: parentOrder.houseType,
          houseTypeName: parentOrder.houseTypeName,
          roomType: parentOrder.roomType,
          location: parentOrder.location,
          latitude: parentOrder.latitude,
          longitude: parentOrder.longitude,
          province: parentOrder.province,
          work_kind_name: parentOrder.work_kind_name,
          work_kind_id: parentOrder.work_kind_id,
          order_no: orderNo,
          order_type: 'craftsman',
          order_status: OrderStatus.ACCEPTED, // 工匠单自动设为已接单
          order_status_name: ORDER_STATUS_MAP[OrderStatus.ACCEPTED],
          wechat_user_id: parentOrder.wechat_user_id,
          craftsman_user_id: craftsman_id,
          parent_order_id: parent_order_id,
          is_assigned: true,
          // 工匠单没有工长费用和上门服务数量
          gangmaster_cost: null,
          visiting_service_num: null,
          total_service_fee: null, // 稍后计算
        });

        savedCraftsmanOrder = await this.orderRepository.save(craftsmanOrder);
        console.log(`为工匠 ${craftsman_id} 创建新订单 ${savedCraftsmanOrder.id}`);
      }

      // 5. 创建工价项并添加到订单（无论是新订单还是现有订单）
      // 无论是主工价还是子工价，复制到分配订单时都作为主工价项（work_group_id = 1）
      const newWorkPriceItems = workPriceItems.map((item) => {
        // 创建工价项副本
        const newItem = this.workPriceItemRepository.create({
          order_id: savedCraftsmanOrder.id,
          work_price_id: item.work_price_id,
          work_price: item.work_price,
          work_title: item.work_title,
          quantity: item.quantity,
          work_kind_name: item.work_kind_name,
          work_kind_id: item.work_kind_id,
          labour_cost_name: item.labour_cost_name,
          minimum_price: item.minimum_price,
          is_set_minimum_price: item.is_set_minimum_price,
          is_paid: false, // 新订单的工价项默认未支付
          is_accepted: false, // 新订单的工价项默认未验收
          assigned_craftsman_id: craftsman_id,
          settlement_amount: item.settlement_amount, // 复制结算金额
          created_by: 'craftsman',
          work_group_id: 1, // 无论是主工价还是子工价，在分配订单中都作为主工价项
          // 子工价相关的字段不需要复制（因为在分配订单中是主工价）
          total_service_fee: null,
          total_service_fee_is_paid: false,
        });
        return newItem;
      });

      // 保存工价项
      const savedWorkPriceItems = await this.workPriceItemRepository.save(newWorkPriceItems);
      
      // 确保保存后的工价项的 work_group_id 都是 1（主工价项）
      // 如果保存后 work_group_id 不是 1，说明有问题，需要修复
      for (const savedItem of savedWorkPriceItems) {
        if (savedItem.work_group_id !== 1) {
          console.warn(
            `警告：工价项 ${savedItem.id} 的 work_group_id 不是 1，而是 ${savedItem.work_group_id}，正在修复...`,
          );
          savedItem.work_group_id = 1;
          savedItem.total_service_fee = null; // 主工价项不应该有平台服务费
          savedItem.total_service_fee_is_paid = false;
          await this.workPriceItemRepository.save(savedItem);
        }
      }

      // 6. 标记原工价项为已分配（保留在工长单中，只是标记为已分配）
      for (const item of workPriceItems) {
        item.assigned_craftsman_id = craftsman_id;
        await this.workPriceItemRepository.save(item);
      }

      // 7. 重新计算 total_service_fee（工匠订单：total_price * 10%）
      // 查询该订单的所有工价项（包括新添加的）
      const allOrderWorkItems = await this.workPriceItemRepository.find({
        where: { order_id: savedCraftsmanOrder.id },
      });
      
      const totalPrice = allOrderWorkItems.reduce(
        (sum, item) => sum + (Number(item.settlement_amount) || 0),
        0,
      );
      // 工匠平台服务费 = total_price * 10%（不包含工长费用）
      const totalServiceFee = totalPrice * 0.1;

      // 8. 更新工匠订单的 total_service_fee
      savedCraftsmanOrder.total_service_fee = totalServiceFee;
      savedCraftsmanOrder.total_service_fee_is_paid = false; // 默认未支付
      await this.orderRepository.save(savedCraftsmanOrder);

      // 9. 返回工匠订单（使用 findOne 方法确保返回完整的订单信息，包括 parent_work_price_groups）
      return await this.findOne(savedCraftsmanOrder.id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('分配工价给工匠失败:', error);
      throw new HttpException(
        '分配工价给工匠失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 标记订单的平台服务费为已支付
   * @param orderId 订单ID
   */
  async markServiceFeeAsPaid(orderId: number): Promise<void> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 1. 检查订单是否已取消
      if (order.order_status === OrderStatus.CANCELLED) {
        throw new HttpException(
          '订单已取消，无法进行支付操作',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 2. 标记平台服务费为已支付
      order.total_service_fee_is_paid = true;
      await this.orderRepository.save(order);

      // 3. 创建平台收支记录（订单级别的平台服务费）
      const totalServiceFee = Number(order.total_service_fee) || 0;
      if (totalServiceFee > 0) {
        await this.platformIncomeRecordService.create({
          orderId: order.id,
          order_no: order.order_no,
          cost_type: CostType.SERVICE_FEE,
          cost_amount: totalServiceFee,
        });
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('标记平台服务费为已支付失败:', error);
      throw new HttpException(
        '标记平台服务费为已支付失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 确认工价项平台服务费支付
   * @param confirmDto 确认支付信息
   * @returns null，由全局拦截器包装成标准响应
   */
  async confirmWorkPriceServiceFee(
    confirmDto: ConfirmWorkPriceServiceFeeDto,
  ): Promise<null> {
    try {
      const { work_price_item_id } = confirmDto;

      // 1. 查找工价项
      const workPriceItem = await this.workPriceItemRepository.findOne({
        where: { id: work_price_item_id },
        relations: ['order'],
      });

      if (!workPriceItem) {
        throw new HttpException('工价项不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 检查订单是否已取消
      if (workPriceItem.order.order_status === OrderStatus.CANCELLED) {
        throw new HttpException(
          '订单已取消，无法进行支付操作',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 3. 验证是否为子工价（只有子工价才有平台服务费）
      if (!workPriceItem.work_group_id || workPriceItem.work_group_id <= 1) {
        throw new HttpException(
          '只有子工价才能支付平台服务费',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 4. 检查平台服务费是否已支付
      if (workPriceItem.total_service_fee_is_paid === true) {
        throw new HttpException(
          '平台服务费已支付，无法重复支付',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 5. 计算平台服务费（如果还没有计算）
      if (!workPriceItem.total_service_fee || workPriceItem.total_service_fee === 0) {
        workPriceItem.total_service_fee = workPriceItem.calculateServiceFee();
      }

      const serviceFee = Number(workPriceItem.total_service_fee) || 0;
      if (serviceFee <= 0) {
        throw new HttpException(
          '平台服务费为0，无需支付',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 6. 标记平台服务费为已支付
      workPriceItem.total_service_fee_is_paid = true;
      await this.workPriceItemRepository.save(workPriceItem);

      // 7. 创建平台收支记录（子工价的平台服务费）
      try {
        await this.platformIncomeRecordService.create({
          orderId: workPriceItem.order_id,
          order_no: workPriceItem.order.order_no,
          cost_type: CostType.SERVICE_FEE,
          cost_amount: serviceFee,
        });
      } catch (recordError) {
        // 记录错误但不影响支付流程
        console.error('创建平台收支记录失败:', recordError);
      }

      // 7. 返回null，全局拦截器会自动包装成标准响应
      return null;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('确认工价项平台服务费支付失败:', error);
      throw new HttpException(
        '确认工价项平台服务费支付失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 检查订单是否完成（所有父工价和子工价都已验收）
   * @param orderId 订单ID
   * @returns 是否完成
   */
  private async checkOrderCompleted(orderId: number): Promise<boolean> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      return false;
    }

    let allWorkItems: WorkPriceItem[];

    // 如果是工匠订单（有 parent_order_id），从父订单中查询分配给该工匠的工价项
    if (order.parent_order_id && order.craftsman_user_id) {
      // 查询父订单中分配给该工匠的所有工价项（包括主工价和子工价）
      allWorkItems = await this.workPriceItemRepository.find({
        where: {
          order_id: order.parent_order_id,
          assigned_craftsman_id: order.craftsman_user_id,
        },
      });
    } else {
      // 普通订单，查询该订单的所有工价项
      allWorkItems = await this.workPriceItemRepository.find({
        where: { order_id: orderId },
      });
    }

    // 检查所有工价项是否都已验收
    if (allWorkItems.length === 0) {
      return false;
    }

    return allWorkItems.every((item) => item.is_accepted === true);
  }

  /**
   * 检查分配给某个工匠的所有工价项是否都已验收
   * @param orderId 订单ID（如果是分配的订单，传入父订单ID）
   * @param assignedCraftsmanId 被分配的工匠ID
   * @returns 是否所有分配给该工匠的工价项都已验收
   */
  private async checkAssignedCraftsmanWorkItemsCompleted(
    orderId: number,
    assignedCraftsmanId: number,
  ): Promise<boolean> {
    // 查询分配给该工匠的所有工价项
    const assignedWorkItems = await this.workPriceItemRepository.find({
      where: {
        order_id: orderId,
        assigned_craftsman_id: assignedCraftsmanId,
      },
    });

    // 如果没有分配给该工匠的工价项，返回 false
    if (assignedWorkItems.length === 0) {
      return false;
    }

    // 检查所有分配给该工匠的工价项是否都已验收
    return assignedWorkItems.every((item) => item.is_accepted === true);
  }

  /**
   * 订单完成时的冻结逻辑
   * 工匠订单：从余额扣除600，不足600就不扣
   * 工长订单：从余额扣除1000
   * @param order 订单
   */
  /**
   * 订单完成时冻结保证金
   * @param order 订单信息
   * @param assignedCraftsmanId 被分配的工匠ID（可选，用于分配的工匠订单）
   */
  private async handleOrderCompletionFreeze(
    order: Order,
    assignedCraftsmanId?: number,
  ): Promise<void> {
    const isGangmasterOrder = order.order_type === 'gangmaster';
    const isCraftsmanOrder = order.order_type === 'craftsman';

    // 确定从哪个工匠账户扣除保证金
    let targetCraftsmanId: number | null = null;
    let freezeAmount = 0;
    let orderTypeDesc = '';

    if (isGangmasterOrder) {
      // 工长订单
      if (assignedCraftsmanId) {
        // 从工长订单分配的工价项：从被分配的工匠账户扣除600元保证金
        targetCraftsmanId = assignedCraftsmanId;
        freezeAmount = 600;
        orderTypeDesc = '工长订单分配的工价项';
      } else {
        // 工长订单本身完成：从工长账户扣除1000元保证金
        targetCraftsmanId = order.craftsman_user_id;
        freezeAmount = 1000;
        orderTypeDesc = '工长订单';
      }
    } else if (isCraftsmanOrder) {
      // 工匠订单：从接单的工匠账户扣除600元保证金
      targetCraftsmanId = order.craftsman_user_id;
      freezeAmount = 600;
      orderTypeDesc = '工匠订单';
    }

    if (!targetCraftsmanId) {
      console.log(`订单 ${order.id}：无法确定目标工匠ID，跳过保证金扣除`);
      return;
    }

    // 获取钱包信息
    const wallet = await this.walletService.getWallet(targetCraftsmanId);
    const currentBalance = Number(wallet.balance) || 0;
    const currentFreezeMoney = Number(wallet.freeze_money) || 0;

    if (currentBalance >= freezeAmount) {
      await this.walletService.deductBalanceAndFreeze(
        targetCraftsmanId,
        freezeAmount,
      );
      console.log(
        `订单 ${order.id} 完成，${orderTypeDesc}冻结金额: ¥${freezeAmount.toFixed(2)}（从工匠ID ${targetCraftsmanId} 扣除）`,
      );
    } else {
      console.log(
        `订单 ${order.id} 完成，${orderTypeDesc}余额不足（余额: ¥${currentBalance.toFixed(2)}），无法冻结 ¥${freezeAmount.toFixed(2)}`,
      );
    }
  }

  /**
   * 单个工价验收
   * @param acceptSingleWorkPriceDto 验收信息
   * @returns null
   */
  async acceptSingleWorkPrice(
    acceptSingleWorkPriceDto: AcceptSingleWorkPriceDto,
  ): Promise<null> {
    try {
      const { work_price_item_id } = acceptSingleWorkPriceDto;

      // 1. 查找工价项
      const workPriceItem = await this.workPriceItemRepository.findOne({
        where: { id: work_price_item_id },
        relations: ['order', 'assigned_craftsman'],
      });

      if (!workPriceItem) {
        throw new HttpException('工价项不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 获取订单信息
      const order = workPriceItem.order;
      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 3. 检查订单是否已取消
      if (order.order_status === OrderStatus.CANCELLED) {
        throw new HttpException(
          '订单已取消，无法进行验收操作',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 4. 判断是否是分配订单，如果是，需要更新父订单的工价项状态
      let targetWorkPriceItem = workPriceItem;
      let parentOrder = order;

      // 如果工价项的 order_id 是分配订单的ID，或者订单本身是分配订单，都需要找到父订单中对应的工价项
      if ((order.parent_order_id && order.craftsman_user_id) || 
          (workPriceItem.order_id !== order.id && order.parent_order_id)) {
        // 分配订单：找到父订单中对应的工价项
        // 优先使用工价项的 order_id 来判断是否是分配订单的工价项
        const actualOrderId = workPriceItem.order_id;
        const isAssignedOrderItem = actualOrderId !== order.id && order.parent_order_id;
        
        let searchOrderId = order.parent_order_id;
        let searchCraftsmanId = order.craftsman_user_id;
        
        // 如果工价项的 order_id 就是父订单ID，说明这是父订单的工价项，直接使用
        if (actualOrderId === order.parent_order_id) {
          targetWorkPriceItem = workPriceItem;
          parentOrder = await this.orderRepository.findOne({
            where: { id: order.parent_order_id },
          });
          console.log(`订单 ${order.id} 是分配订单，工价项 ${workPriceItem.id} 属于父订单 ${order.parent_order_id}，直接使用`);
        } else {
          // 否则，查找父订单中对应的工价项
          const parentWorkPriceItem = await this.workPriceItemRepository.findOne({
            where: {
              order_id: searchOrderId,
              work_price_id: workPriceItem.work_price_id,
              assigned_craftsman_id: searchCraftsmanId,
            },
          });

          if (parentWorkPriceItem) {
            // 使用父订单的工价项进行验收
            targetWorkPriceItem = parentWorkPriceItem;
            parentOrder = await this.orderRepository.findOne({
              where: { id: searchOrderId },
            });
            console.log(`订单 ${order.id} 是分配订单，将更新父订单 ${searchOrderId} 的工价项 ${parentWorkPriceItem.id}`);
          } else {
            console.warn(`订单 ${order.id} 是分配订单，但未找到父订单 ${searchOrderId} 中对应的工价项（work_price_id: ${workPriceItem.work_price_id}, assigned_craftsman_id: ${searchCraftsmanId}），使用当前工价项`);
          }
        }
      }

      // 5. 检查父订单工价项是否已验收
      if (targetWorkPriceItem.is_accepted === true) {
        throw new HttpException(
          '工价项已验收，无法重复验收',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 6. 检查父订单工价项是否已支付
      if (targetWorkPriceItem.is_paid !== true) {
        throw new HttpException(
          '工价项尚未支付，无法验收',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 7. 判断订单类型
      const isGangmasterOrder = parentOrder.order_type === 'gangmaster';
      const isCraftsmanOrder = parentOrder.order_type === 'craftsman';

      // 8. 获取分配的工匠ID
      // 如果是工匠订单，且没有分配工匠，则使用订单的接单工匠（craftsman_user_id）
      // 如果是工长订单，必须有分配的工匠（assigned_craftsman_id）
      let assignedCraftsmanId = targetWorkPriceItem.assigned_craftsman_id;
      
      if (!assignedCraftsmanId) {
        if (isCraftsmanOrder) {
          // 工匠订单：使用订单的接单工匠
          assignedCraftsmanId = parentOrder.craftsman_user_id;
          if (!assignedCraftsmanId) {
            throw new HttpException(
              '订单尚未接单，无法验收',
              HttpStatus.BAD_REQUEST,
            );
          }
        } else {
          // 工长订单：必须分配工匠
          throw new HttpException(
            '工价项未分配工匠，无法验收',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // 7. 计算结算金额
      const settlementAmount = targetWorkPriceItem.calculateSettlementAmount();

      // 8. 标记父订单工价项为已验收
      console.log(`订单 ${parentOrder.id} 验收：更新工价项 ${targetWorkPriceItem.id} 的 is_accepted 为 true (当前值: ${targetWorkPriceItem.is_accepted})`);
      targetWorkPriceItem.is_accepted = true;
      const savedItem = await this.workPriceItemRepository.save(targetWorkPriceItem);
      console.log(`订单 ${parentOrder.id} 验收：工价项 ${savedItem.id} 保存成功，is_accepted: ${savedItem.is_accepted}`);
      
      // 验证保存是否成功
      const verifyItem = await this.workPriceItemRepository.findOne({
        where: { id: targetWorkPriceItem.id },
      });
      if (verifyItem && verifyItem.is_accepted !== true) {
        console.error(`订单 ${parentOrder.id} 验收：工价项 ${targetWorkPriceItem.id} 保存失败，is_accepted 仍为 ${verifyItem.is_accepted}`);
        throw new HttpException(
          `工价项 ${targetWorkPriceItem.id} 验收状态更新失败`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // 9. 如果是分配订单，同步更新分配订单的工价项状态
      if (order.parent_order_id && order.craftsman_user_id && workPriceItem.id !== targetWorkPriceItem.id) {
      workPriceItem.is_accepted = true;
      await this.workPriceItemRepository.save(workPriceItem);
        console.log(`订单 ${order.id} 验收：同步更新分配订单的工价项 ${workPriceItem.id} 状态`);
      }

      // 10. 打款给分配的工匠（验收时不冻结，全部打入余额）
      if (settlementAmount > 0) {
        await this.walletService.addBalance(assignedCraftsmanId, settlementAmount);

        // 创建账户明细
        try {
          await this.walletTransactionService.create({
            craftsman_user_id: assignedCraftsmanId,
            amount: settlementAmount,
            type: WalletTransactionType.INCOME,
            description: '订单验收',
            order_id: order.id.toString(),
          });
        } catch (error) {
          console.error('创建账户明细失败:', error);
        }
      }

      // 10. 如果是工长订单，且验收的工种是泥工或水电，给工长打款25%
      if (isGangmasterOrder) {
        const workKindName = targetWorkPriceItem.work_kind_name;
        const isTilerOrPlumbing = workKindName === '泥工' || workKindName === '水电';

        if (isTilerOrPlumbing && parentOrder.craftsman_user_id) {
          // 获取工长费用
          const gangmasterCost = Number(parentOrder.gangmaster_cost) || 0;
          if (gangmasterCost > 0) {
            // 给工长打款 25%
            const foremanAmount = gangmasterCost * 0.25;
            await this.walletService.addBalance(
              parentOrder.craftsman_user_id,
              foremanAmount,
            );

            // 创建账户明细（使用原始订单ID）
            try {
              await this.walletTransactionService.create({
                craftsman_user_id: parentOrder.craftsman_user_id,
                amount: foremanAmount,
                type: WalletTransactionType.INCOME,
                description: '订单验收（工长费用）',
                order_id: parentOrder.id.toString(),
              });
            } catch (error) {
              console.error('创建账户明细失败:', error);
            }
          }
        }
      }

      // 11. 检查是否需要扣除保证金
      // 判断逻辑：
      // 1. 如果工价项有 assigned_craftsman_id，说明是从工长订单分配的，检查分配给该工匠的所有工价项是否都验收了
      // 2. 如果是普通工匠订单（没有 assigned_craftsman_id），检查整个订单是否完成
      let shouldFreeze = false;
      let isOrderCompleted = false;

      // 判断是否是分配的工价项（从工长订单分配的）
      const isAssignedWorkItem = targetWorkPriceItem.assigned_craftsman_id != null;
      
      if (isAssignedWorkItem && isGangmasterOrder && assignedCraftsmanId) {
        // 从工长订单分配的工价项：检查分配给该工匠的所有工价项是否都验收了
        const allAssignedItemsCompleted = await this.checkAssignedCraftsmanWorkItemsCompleted(
          parentOrder.id, // 工长订单ID
          assignedCraftsmanId,
        );
        
        if (allAssignedItemsCompleted) {
          shouldFreeze = true;
          console.log(
            `工长订单 ${parentOrder.id}：分配给工匠 ${assignedCraftsmanId} 的所有工价项都已验收，准备扣除保证金`,
          );
          
          // 检查整个订单是否完成（所有工价项都已验收）
          isOrderCompleted = await this.checkOrderCompleted(parentOrder.id);
          if (isOrderCompleted) {
            console.log(
              `工长订单 ${parentOrder.id}：所有工价项都已验收，订单已完成`,
            );
            
            // 订单完成时打款剩余的75%工长费用
            if (parentOrder.craftsman_user_id) {
              const gangmasterCost = Number(parentOrder.gangmaster_cost) || 0;
              if (gangmasterCost > 0) {
                // 查询所有已验收的泥工或水电工价项，计算已支付的25%
                const allWorkItems = await this.workPriceItemRepository.find({
                  where: { order_id: parentOrder.id },
                });

                const acceptedTilerOrPlumbingItems = allWorkItems.filter(
                  (item) =>
                    (item.work_kind_name === '泥工' || item.work_kind_name === '水电') &&
                    item.is_accepted === true,
                );

                // 计算已经支付的工长费用（每个单项25%）
                const paidAmount = acceptedTilerOrPlumbingItems.length * gangmasterCost * 0.25;

                // 剩余需要支付的工长费用（75%）
                const remainingAmount = gangmasterCost - paidAmount;

                if (remainingAmount > 0) {
                  // 订单完成时打款剩余的75%
                  await this.walletService.addBalance(
                    parentOrder.craftsman_user_id,
                    remainingAmount,
                  );

                  // 创建账户明细
                  try {
                    await this.walletTransactionService.create({
                      craftsman_user_id: parentOrder.craftsman_user_id,
                      amount: remainingAmount,
                      type: WalletTransactionType.INCOME,
                      description: '订单验收（工长费用剩余）',
                      order_id: parentOrder.id.toString(),
                    });
                  } catch (error) {
                    console.error('创建账户明细失败:', error);
                  }
                }
              }
            }

            // 更新父订单状态为已完成
            parentOrder.order_status = OrderStatus.COMPLETED;
            parentOrder.order_status_name = ORDER_STATUS_MAP[OrderStatus.COMPLETED];
            await this.orderRepository.save(parentOrder);
          }
        } else {
          console.log(
            `工长订单 ${parentOrder.id}：分配给工匠 ${assignedCraftsmanId} 的工价项尚未全部验收，当前验收状态：`,
            await this.workPriceItemRepository.find({
              where: {
                order_id: parentOrder.id,
                assigned_craftsman_id: assignedCraftsmanId,
              },
            }).then(items => items.map(item => ({
              id: item.id,
              work_title: item.work_title,
              is_accepted: item.is_accepted,
            }))),
          );
        }
      } else {
        // 普通订单：检查整个订单是否完成
        isOrderCompleted = await this.checkOrderCompleted(parentOrder.id);
        if (isOrderCompleted) {
          shouldFreeze = true;
          
          // 如果是工长订单，订单完成时打款剩余的75%工长费用
          if (isGangmasterOrder && parentOrder.craftsman_user_id) {
            const gangmasterCost = Number(parentOrder.gangmaster_cost) || 0;
            if (gangmasterCost > 0) {
              // 查询所有已验收的泥工或水电工价项，计算已支付的25%
              const allWorkItems = await this.workPriceItemRepository.find({
                where: { order_id: parentOrder.id },
              });

              const acceptedTilerOrPlumbingItems = allWorkItems.filter(
                (item) =>
                  (item.work_kind_name === '泥工' || item.work_kind_name === '水电') &&
                  item.is_accepted === true,
              );

              // 计算已经支付的工长费用（每个单项25%）
              const paidAmount = acceptedTilerOrPlumbingItems.length * gangmasterCost * 0.25;

              // 剩余需要支付的工长费用（75%）
              const remainingAmount = gangmasterCost - paidAmount;

              if (remainingAmount > 0) {
                // 订单完成时打款剩余的75%
                await this.walletService.addBalance(
                  parentOrder.craftsman_user_id,
                  remainingAmount,
                );

                // 创建账户明细
                try {
                  await this.walletTransactionService.create({
                    craftsman_user_id: parentOrder.craftsman_user_id,
                    amount: remainingAmount,
                    type: WalletTransactionType.INCOME,
                    description: '订单验收（工长费用剩余）',
                    order_id: parentOrder.id.toString(),
                  });
                } catch (error) {
                  console.error('创建账户明细失败:', error);
                }
              }
            }
          }

          parentOrder.order_status = OrderStatus.COMPLETED;
          parentOrder.order_status_name = ORDER_STATUS_MAP[OrderStatus.COMPLETED];
          await this.orderRepository.save(parentOrder);
        }
      }

      // 扣除保证金
      // 1. 分配的工价项（从工长订单分配）：分配给该工匠的所有工价项都验收时扣除
      // 2. 普通订单：整个订单完成时扣除
      if (shouldFreeze) {
        // 如果是分配的工价项，从被分配的工匠账户扣除保证金
        // 如果是普通订单，从接单的工匠账户扣除保证金
        await this.handleOrderCompletionFreeze(
          parentOrder,
          isAssignedWorkItem ? assignedCraftsmanId : undefined,
        );
      }

      return null;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('单个工价验收失败:', error);
      throw new HttpException(
        '单个工价验收失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

}

