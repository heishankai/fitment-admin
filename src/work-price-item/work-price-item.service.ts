import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkPriceItem } from './work-price-item.entity';
import { Order } from '../order/order.entity';
import { CreateWorkPriceItemsDto } from './dto/create-work-price-items.dto';

@Injectable()
export class WorkPriceItemService {
  constructor(
    @InjectRepository(WorkPriceItem)
    private readonly workPriceItemRepository: Repository<WorkPriceItem>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  /**
   * 根据订单ID查询工价项列表
   * @param orderId 订单ID
   * @returns 工价项列表
   */
  async findByOrderId(orderId: number): Promise<WorkPriceItem[]> {
    try {
      // 验证订单是否存在
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 查询该订单的所有工价项
      return await this.workPriceItemRepository.find({
        where: { order_id: orderId },
        relations: ['assigned_craftsman'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('查询工价项失败:', error);
      throw new HttpException(
        '查询工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据ID查询工价项
   * @param id 工价项ID
   * @returns 工价项
   */
  async findById(id: number): Promise<WorkPriceItem> {
    try {
      const workPriceItem = await this.workPriceItemRepository.findOne({
        where: { id },
        relations: ['order', 'assigned_craftsman', 'parent_work_item'],
      });

      if (!workPriceItem) {
        throw new HttpException('工价项不存在', HttpStatus.NOT_FOUND);
      }

      return workPriceItem;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('查询工价项失败:', error);
      throw new HttpException(
        '查询工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 创建工价项
   * @param workPriceItemData 工价项数据
   * @returns 创建的工价项
   */
  async create(
    workPriceItemData: Partial<WorkPriceItem>,
  ): Promise<WorkPriceItem> {
    try {
      // 验证订单是否存在
      const order = await this.orderRepository.findOne({
        where: { id: workPriceItemData.order_id },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 创建工价项（settlement_amount 会在 BeforeInsert 钩子中自动计算）
      const workPriceItem =
        this.workPriceItemRepository.create(workPriceItemData);
      const saved = await this.workPriceItemRepository.save(workPriceItem);

      return saved;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('创建工价项失败:', error);
      throw new HttpException(
        '创建工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 批量创建工价项
   * @param workPriceItemsData 工价项数据数组
   * @returns 创建的工价项列表
   */
  async createBatch(
    workPriceItemsData: Partial<WorkPriceItem>[],
  ): Promise<WorkPriceItem[]> {
    try {
      // 如果数据不为空，验证第一个工价项的订单是否存在
      if (workPriceItemsData.length > 0 && workPriceItemsData[0].order_id) {
        const order = await this.orderRepository.findOne({
          where: { id: workPriceItemsData[0].order_id },
        });

        if (!order) {
          throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
        }
      }

      const workPriceItems = workPriceItemsData.map((data) =>
        this.workPriceItemRepository.create(data),
      );
      return await this.workPriceItemRepository.save(workPriceItems);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('批量创建工价项失败:', error);
      throw new HttpException(
        '批量创建工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 更新工价项
   * @param id 工价项ID
   * @param updateData 更新数据
   * @returns 更新后的工价项
   */
  async update(
    id: number,
    updateData: Partial<WorkPriceItem>,
  ): Promise<WorkPriceItem> {
    try {
      const workPriceItem = await this.workPriceItemRepository.findOne({
        where: { id },
      });

      if (!workPriceItem) {
        throw new HttpException('工价项不存在', HttpStatus.NOT_FOUND);
      }

      // 更新字段（settlement_amount 会在 BeforeUpdate 钩子中自动重新计算）
      Object.assign(workPriceItem, updateData);
      const saved = await this.workPriceItemRepository.save(workPriceItem);

      return saved;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('更新工价项失败:', error);
      throw new HttpException(
        '更新工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据工价ID将工价变为支付状态
   * @param id 工价项ID
   * @returns 更新后的工价项
   */
  async markAsPaid(id: number): Promise<WorkPriceItem> {
    try {
      const workPriceItem = await this.workPriceItemRepository.findOne({
        where: { id },
      });

      if (!workPriceItem) {
        throw new HttpException('工价项不存在', HttpStatus.NOT_FOUND);
      }

      // 将支付状态设置为 true
      workPriceItem.is_paid = true;
      const saved = await this.workPriceItemRepository.save(workPriceItem);

      return saved;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('更新工价支付状态失败:', error);
      throw new HttpException(
        '更新工价支付状态失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 删除工价项
   * @param id 工价项ID
   * @returns null
   */
  async delete(id: number): Promise<null> {
    try {
      const workPriceItem = await this.workPriceItemRepository.findOne({
        where: { id },
      });

      if (!workPriceItem) {
        throw new HttpException('工价项不存在', HttpStatus.NOT_FOUND);
      }

      await this.workPriceItemRepository.remove(workPriceItem);
      return null;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('删除工价项失败:', error);
      throw new HttpException(
        '删除工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 查询主工价项（work_group_id = 1）
   * @param orderId 订单ID
   * @returns 主工价项列表
   */
  async findMainWorkPriceItems(orderId: number): Promise<WorkPriceItem[]> {
    try {
      return await this.workPriceItemRepository.find({
        where: {
          order_id: orderId,
          work_group_id: 1,
        },
        relations: ['assigned_craftsman'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      console.error('查询主工价项失败:', error);
      throw new HttpException(
        '查询主工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 查询子工价项（根据工价组ID）
   * @param workGroupId 工价组ID
   * @returns 子工价项列表
   */
  async findSubWorkPriceItems(
    workGroupId: number,
  ): Promise<WorkPriceItem[]> {
    try {
      return await this.workPriceItemRepository.find({
        where: {
          work_group_id: workGroupId,
        },
        relations: ['assigned_craftsman'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      console.error('查询子工价项失败:', error);
      throw new HttpException(
        '查询子工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据订单ID和工价组ID查询工价项
   * @param orderId 订单ID
   * @param workGroupId 工价组ID
   * @returns 工价项列表
   */
  async findByOrderIdAndWorkGroupId(
    orderId: number,
    workGroupId: number,
  ): Promise<WorkPriceItem[]> {
    try {
      return await this.workPriceItemRepository.find({
        where: {
          order_id: orderId,
          work_group_id: workGroupId,
        },
        relations: ['assigned_craftsman'],
        order: { createdAt: 'ASC' },
      });
    } catch (error) {
      console.error('查询工价项失败:', error);
      throw new HttpException(
        '查询工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据订单ID查询所有子工价组（work_group_id > 1）
   * @param orderId 订单ID
   * @returns 子工价组列表，每个组包含统计信息
   */
  async findSubWorkPriceGroupsByOrderId(orderId: number): Promise<any[]> {
    try {
      // 验证订单是否存在
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 查询该订单的所有工价项（无论是分配的订单还是普通订单，都查询自己的工价项）
      // 注意：分配的订单中，子工价会被复制为主工价项（work_group_id = 1），所以新订单中不应该有子工价组
      const allWorkItems = await this.workPriceItemRepository.find({
        where: { order_id: orderId },
        relations: ['assigned_craftsman'],
        order: { createdAt: 'ASC' },
      });

      // 筛选出子工价组（work_group_id > 1）
      const subWorkItems = allWorkItems.filter(
        (item) => item.work_group_id && item.work_group_id > 1,
      );

      // 按 work_group_id 分组
      const workGroupMap = new Map<number, WorkPriceItem[]>();
      for (const item of subWorkItems) {
        const groupId = item.work_group_id!;
        if (!workGroupMap.has(groupId)) {
          workGroupMap.set(groupId, []);
        }
        workGroupMap.get(groupId)!.push(item);
      }

      // 查询订单的工匠信息
      const orderWithCraftsman = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['craftsman_user'],
      });

      // 转换为数组并计算每个组的统计信息
      const subWorkPriceGroups = Array.from(workGroupMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([groupId, items]) => {
          // total_price: 该组所有工价项的 settlement_amount 之和
          const total_price = items.reduce(
            (sum, item) => sum + (Number(item.settlement_amount) || 0),
            0,
          );

          // total_is_accepted: 该组所有工价项的验收状态，全部为true才为true
          const total_is_accepted =
            items.length > 0 &&
            items.every((item) => item.is_accepted === true);

          // is_paid: 该组所有工价项的支付状态，全部为true才为true
          const is_paid =
            items.length > 0 && items.every((item) => item.is_paid === true);

          // total_service_fee: total_price * 10%
          const total_service_fee = total_price * 0.1;

          return {
            work_group_id: groupId,
            total_is_accepted,
            total_price,
            is_paid,
            total_service_fee,
            sub_work_price_groups: items,
            // 工匠信息（昵称和手机号码）
            craftsman_nickname: orderWithCraftsman?.craftsman_user?.nickname || null,
            craftsman_phone: orderWithCraftsman?.craftsman_user?.phone || null,
          };
        });

      return subWorkPriceGroups;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('查询子工价组失败:', error);
      throw new HttpException(
        '查询子工价组失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据前端数据格式创建工价项（主工价）
   * @param createDto 前端传递的工价数据
   * @returns 创建的工价项列表
   */
  async createFromFrontendData(
    createDto: CreateWorkPriceItemsDto,
  ): Promise<WorkPriceItem[]> {
    try {
      // 1. 验证订单是否存在
      const order = await this.orderRepository.findOne({
        where: { id: createDto.order_id },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 从订单中获取订单类型（如果订单中没有，则根据 work_kind_name 判断）
      let orderType = order.order_type;
      if (!orderType) {
        // 如果订单中没有 order_type，根据 work_kind_name 判断
        orderType = order.work_kind_name === '工长' ? 'gangmaster' : 'craftsman';
      }

      // 3. 查询该订单当前的最大 work_group_id，生成新的 work_group_id
      // 如果订单有 parent_order_id，说明是工匠订单，创建的都是子工价（work_group_id > 1）
      // 如果没有 parent_order_id，且没有工价项，说明是第一次创建，work_group_id = 1（主工价组）
      // 如果没有 parent_order_id，但已有工价项，work_group_id = max + 1（子工价组）
      const existingWorkItems = await this.workPriceItemRepository.find({
        where: { order_id: createDto.order_id },
        select: ['work_group_id'],
      });

      let workGroupId = 1; // 默认第1组（主工价组）
      
      // 如果订单有 parent_order_id，说明是工匠订单，创建的都是子工价
      if (order.parent_order_id) {
        // 工匠订单的工价都是子工价，从第2组开始
        if (existingWorkItems.length > 0) {
          const maxWorkGroupId = Math.max(
            ...existingWorkItems
              .map((item) => item.work_group_id)
              .filter((id) => id !== null && id !== undefined),
            1, // 从1开始，因为工匠订单的主工价组（work_group_id = 1）已经在分配时创建
          );
          workGroupId = maxWorkGroupId + 1; // 第N组（子工价组）
        } else {
          // 如果工匠订单还没有工价项，说明是第一次创建子工价，从第2组开始
          workGroupId = 2;
        }
      } else {
        // 没有 parent_order_id 的订单，按照原来的逻辑
        if (existingWorkItems.length > 0) {
          const maxWorkGroupId = Math.max(
            ...existingWorkItems
              .map((item) => item.work_group_id)
              .filter((id) => id !== null && id !== undefined),
            0,
          );
          workGroupId = maxWorkGroupId + 1; // 第N组（子工价组）
        }
      }

      // 4. 将前端数据格式转换为 WorkPriceItem 实体格式
      const workPriceItemsData: Partial<WorkPriceItem>[] =
        createDto.work_price_list.map((item) => ({
          order_id: createDto.order_id,
          work_price_id: item.work_price_id,
          work_price:
            typeof item.work_price === 'string'
              ? parseFloat(item.work_price)
              : item.work_price,
          work_title: item.work_title,
          quantity:
            typeof item.quantity === 'string'
              ? parseFloat(item.quantity)
              : item.quantity,
          work_kind_name: item.work_kind_name,
          work_kind_id: item.work_kind_id,
          labour_cost_name: item.labour_cost_name,
          minimum_price: item.minimum_price || null,
          is_set_minimum_price: item.is_set_minimum_price,
          created_by: orderType, // 从订单中获取：'gangmaster' 或 'craftsman'
          work_group_id: workGroupId, // 工价组ID：第1组=主工价组，第N组=子工价组
          is_paid: false, // 默认未付款
          is_accepted: false, // 默认未验收
          assigned_craftsman_id: null, // 初始时未分配工匠
        }));

      // 5. 批量创建工价项（settlement_amount 会在 BeforeInsert 钩子中自动计算）
      const createdItems = await this.createBatch(workPriceItemsData);

      // 6. 计算并更新订单的 total_service_fee 和 visiting_service_num（仅在主工价组（work_group_id = 1）生成时计算）
      if (workGroupId === 1) {
        // 重新计算实际的 total_price（所有主工价项的 settlement_amount 之和）
        // 因为 settlement_amount 可能在 BeforeInsert 钩子中被修改（如应用最低价格）
        const actualTotalPrice = createdItems.reduce(
          (sum, item) => sum + (Number(item.settlement_amount) || 0),
          0,
        );
        
        await this.updateOrderServiceFeeAndVisitingNum(
          createDto.order_id,
          orderType,
          createDto.area,
          actualTotalPrice,
        );
      }

      return createdItems;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('创建工价项失败:', error);
      throw new HttpException(
        '创建工价项失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
  private calcForeman(
    area: number,
    cost: number,
  ): {
    foremanFee: number;
    visits: number;
  } {
    // 规则1：不足60平按照60平计算
    const actualArea = Math.max(area, 60);

    // 1. 面积段基础信息配置
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
    if (!cfg) {
      const baseConfig = areaConfigs[areaConfigs.length - 1];
      const extraArea = actualArea - 200;
      const extraUnits = Math.floor(extraArea / 10);
      cfg = {
        ...baseConfig,
        baseFee: baseConfig.baseFee + extraUnits * 400,
        baseVisit: baseConfig.baseVisit + extraUnits * 2,
        step: baseConfig.step + extraUnits * 2000,
      };
    }

    // 4. 计算施工费用档位
    const step1 = cfg.step;
    const step2 = step1 * 1.35;
    const step3 = step1 * 1.7;

    let level = 0;
    if (cost <= step1) {
      level = 0;
    } else if (cost <= step2) {
      level = 1;
    } else if (cost <= step3) {
      level = 2;
    } else {
      level = 3;
    }

    // 5. 工长费用 = 基础工长费 + 档位 * 1000
    const foremanFee = cfg.baseFee + level * 1000;

    // 6. 上门次数 = 基础上门次数 + 档位 * 3
    const visits = cfg.baseVisit + level * 3;

    return { foremanFee, visits };
  }

  /**
   * 更新订单的平台服务费和上门服务数量（仅在主工价生成时计算）
   * @param orderId 订单ID
   * @param orderType 订单类型
   * @param area 面积
   * @param totalPrice 总价
   */
  private async updateOrderServiceFeeAndVisitingNum(
    orderId: number,
    orderType: string,
    area: number | string,
    totalPrice: number,
  ): Promise<void> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        return;
      }

      const actualArea = typeof area === 'string' ? parseFloat(area) : area;
      const constructionCost = totalPrice; // 施工费用

      let totalServiceFee = 0;
      let visitingServiceNum = 0;

      // 如果是工长订单，需要计算上门次数和工长费用
      if (orderType === 'gangmaster') {
        // 计算工长费用和上门次数
        const foremanResult = this.calcForeman(actualArea, constructionCost);
        visitingServiceNum = foremanResult.visits;
        // 保存工长费用（只计算第一次工价的）
        order.gangmaster_cost = foremanResult.foremanFee;
        // 工长平台服务费 = (gangmaster_cost + total_price) * 10%
        const gangmasterCost = foremanResult.foremanFee;
        totalServiceFee = (gangmasterCost + constructionCost) * 0.1;
      } else {
        // 工匠订单：平台服务费 = total_price * 10%
        totalServiceFee = constructionCost * 0.1;
        visitingServiceNum = 0;
        order.gangmaster_cost = null; // 工匠订单没有工长费用
      }

      // 更新订单
      order.total_service_fee = totalServiceFee;
      order.total_service_fee_is_paid = false; // 默认未支付
      order.visiting_service_num = visitingServiceNum;
      await this.orderRepository.save(order);
    } catch (error) {
      console.error('更新订单服务费和上门次数失败:', error);
      // 不抛出异常，避免影响工价创建
    }
  }
}
