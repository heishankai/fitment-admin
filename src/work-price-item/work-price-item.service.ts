import {
  Injectable,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import Decimal from 'decimal.js';
import { WorkPriceItem } from './work-price-item.entity';
import { Order, OrderStatus } from '../order/order.entity';
import { WX_PAY_CONFIG } from '../common/constants/app.constants';
import { CreateWorkPriceItemsDto } from './dto/create-work-price-items.dto';
import { Materials } from '../materials/materials.entity';
import { MaterialsResponseDto, CommodityItemResponse } from '../materials/dto/materials-response.dto';
import { ConstructionProgressService } from '../construction-progress/construction-progress.service';
import { OrderService } from '../order/order.service';
import { PlatformIncomeRecordService } from '../platform-income-record/platform-income-record.service';
import { CostType } from '../platform-income-record/platform-income-record.entity';

@Injectable()
export class WorkPriceItemService {
  constructor(
    @InjectRepository(WorkPriceItem)
    private readonly workPriceItemRepository: Repository<WorkPriceItem>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Materials)
    private readonly materialsRepository: Repository<Materials>,
    private readonly constructionProgressService: ConstructionProgressService,
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
    private readonly platformIncomeRecordService: PlatformIncomeRecordService,
  ) {}

  /**
   * 按订单查询主工价 + 子工价（工匠订单场景：独立工匠单或分配工匠单均包含父工价组与子工价组）
   * 分配工匠单：从父订单取「分配给当前接单工匠」的工价项，再按 work_group_id 拆成主/子
   */
  async getWorkPricesByOrderId(orderId: number): Promise<any> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['craftsman_user'],
    });
    if (!order) {
      throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
    }

    let allWorkItems: WorkPriceItem[];
    if (order.parent_order_id && order.craftsman_user_id) {
      allWorkItems = await this.workPriceItemRepository.find({
        where: {
          order_id: order.parent_order_id,
          assigned_craftsman_id: order.craftsman_user_id,
        },
        relations: ['assigned_craftsman'],
        order: { createdAt: 'ASC' },
      });
    } else {
      allWorkItems = await this.workPriceItemRepository.find({
        where: { order_id: orderId },
        relations: ['assigned_craftsman'],
        order: { createdAt: 'ASC' },
      });
    }

    const mainItems = allWorkItems.filter(
      (i) => !i.work_group_id || i.work_group_id === 1,
    );
    const subItems = allWorkItems.filter(
      (i) => i.work_group_id && i.work_group_id > 1,
    );

    const toPlain = (item: WorkPriceItem) => ({
      ...item,
      current_order_id: orderId,
    });

    const mainGroup =
      mainItems.length > 0
        ? {
            current_order_id: orderId,
            parent_order_id: order.parent_order_id || null,
            items: mainItems.map(toPlain),
            total_price: mainItems.reduce(
              (s, i) => s + i.calculateSettlementAmount(),
              0,
            ),
            total_is_accepted: mainItems.every((i) => i.is_accepted),
            is_paid: mainItems.every((i) => i.is_paid),
            gangmaster_cost:
              order.order_type === 'gangmaster'
                ? Number(order.gangmaster_cost) || 0
                : undefined,
            visiting_service_num:
              order.order_type === 'gangmaster'
                ? order.visiting_service_num
                : undefined,
            total_service_fee: Number(order.total_service_fee) || 0,
          }
        : null;

    const groupMap = new Map<number, WorkPriceItem[]>();
    for (const i of subItems) {
      const gid = i.work_group_id!;
      if (!groupMap.has(gid)) groupMap.set(gid, []);
      groupMap.get(gid)!.push(i);
    }
    const subGroups = Array.from(groupMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([groupId, items]) => {
        const total_price = items.reduce(
          (s, i) => s + (Number(i.settlement_amount) || 0),
          0,
        );
        return {
          work_group_id: groupId,
          current_order_id: orderId,
          parent_order_id: order.parent_order_id || null,
          items: items.map(toPlain),
          total_price,
          total_is_accepted: items.every((i) => i.is_accepted),
          is_paid: items.every((i) => i.is_paid),
          total_service_fee: total_price * 0.1,
        };
      });

    return {
      order_id: orderId,
      order_type: order.order_type || null,
      is_assigned: !!order.parent_order_id,
      parent_order_id: order.parent_order_id || null,
      main_work_price_group: mainGroup,
      sub_work_price_groups: subGroups,
    };
  }

  /**
   * 将 work_price_item_ids 中的工价项全部验收（委托 OrderService，与单条验收业务一致）
   */
  async batchAcceptByWorkPriceItemIds(
    workPriceItemIds: number[],
  ): Promise<null> {
    return this.orderService.batchAcceptWorkPriceItemsByIds(workPriceItemIds);
  }

  /**
   * 根据工价项ID + 工匠ID，解析其「分配工匠订单」，返回该工匠单下全部工价（主工价 + 子工价，结构同 getWorkPricesByOrderId）
   */
  async getWorkPricesByWorkPriceItemAndCraftsman(
    workPriceItemId: number,
    craftsmanId: number,
  ): Promise<any> {
    const item = await this.workPriceItemRepository.findOne({
      where: { id: workPriceItemId },
      relations: ['order'],
    });
    if (!item) {
      throw new HttpException('工价项不存在', HttpStatus.NOT_FOUND);
    }
    if (item.assigned_craftsman_id !== craftsmanId) {
      throw new HttpException('无权查看此工价', HttpStatus.FORBIDDEN);
    }

    let craftsmanOrderId: number;

    if (item.order?.parent_order_id == null) {
      const craftsmanOrder = await this.orderRepository.findOne({
        where: {
          parent_order_id: item.order_id,
          craftsman_user_id: craftsmanId,
          is_assigned: true,
        },
      });
      if (!craftsmanOrder) {
        throw new HttpException(
          '尚未生成分配工匠订单，无法查询该工匠全部工价',
          HttpStatus.BAD_REQUEST,
        );
      }
      craftsmanOrderId = craftsmanOrder.id;
    } else {
      craftsmanOrderId = item.order_id;
    }

    return this.getWorkPricesByOrderId(craftsmanOrderId);
  }

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

      // 转换为数组并计算每个组的统计信息，同时为每个工价项添加最新的施工进度
      const subWorkPriceGroups = await Promise.all(
        Array.from(workGroupMap.entries())
          .sort(([a], [b]) => a - b)
          .map(async ([groupId, items]) => {
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

            // 为每个工价项添加最新的施工进度数据
            const itemsWithProgress = await Promise.all(
              items.map(async (item) => {
                let latestConstructionProgress = null;

                // 如果工价项已分配给工匠，查询对应的施工进度
                if (item.assigned_craftsman_id) {
                  try {
                    // 确定要查询的订单ID
                    let targetOrderId: number | null = null;

                    // 判断当前查询的是分配订单还是普通订单
                    if (order.parent_order_id && order.craftsman_user_id) {
                      // 当前查询的是分配订单（工匠订单）
                      // 工价项在父订单中，需要找到对应的工匠订单来查询施工进度
                      // 当前订单就是对应的工匠订单
                      targetOrderId = orderId;
                    } else {
                      // 当前查询的是普通订单（工长订单）
                      // 工价项在当前订单中，如果已分配给工匠，需要找到对应的工匠订单
                      const craftsmanOrder = await this.orderRepository.findOne({
                        where: {
                          parent_order_id: item.order_id,
                          craftsman_user_id: item.assigned_craftsman_id,
                          is_assigned: true,
                        },
                      });

                      if (craftsmanOrder) {
                        // 找到了对应的工匠订单，查询工匠订单的施工进度
                        targetOrderId = craftsmanOrder.id;
                      } else {
                        // 如果没有找到工匠订单，说明工价项还未分配给工匠，或者工价项在当前订单中
                        // 直接使用当前订单ID查询施工进度
                        targetOrderId = orderId;
                      }
                    }

                    // 查询该订单的所有施工进度，按创建时间倒序排列，取最新的一条
                    if (targetOrderId) {
                      const constructionProgressList =
                        await this.constructionProgressService.findByOrderId(
                          targetOrderId,
                        );

                      if (
                        constructionProgressList &&
                        constructionProgressList.length > 0
                      ) {
                        // 取最新的一条施工进度（已经是按 createdAt DESC 排序的）
                        latestConstructionProgress =
                          constructionProgressList[0];
                      }
                    }
                  } catch (error) {
                    // 查询施工进度失败不影响查询，只记录错误
                    console.error(
                      `查询工价项 ${item.id} 的施工进度失败:`,
                      error,
                    );
                  }
                }

                return {
                  ...item,
                  latest_construction_progress: latestConstructionProgress,
                };
              }),
            );

            return {
              work_group_id: groupId,
              total_is_accepted,
              total_price,
              is_paid,
              total_service_fee,
              sub_work_price_groups: itemsWithProgress,
              // 工匠信息（昵称和手机号码）
              craftsman_nickname:
                orderWithCraftsman?.craftsman_user?.nickname || null,
              craftsman_phone:
                orderWithCraftsman?.craftsman_user?.phone || null,
            };
          }),
      );

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
          work_kind_code: item.work_kind_code,
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

  /**
   * 根据工价项ID和工匠ID获取对应工匠创建的辅材料列表
   * @param workPriceItemId 工价项ID
   * @param craftsmanId 工匠ID
   * @returns 辅材响应数据（包含商品列表和总价）
   */
  async getMaterialsByWorkPriceItemIdAndCraftsmanId(
    workPriceItemId: number,
    craftsmanId: number,
  ): Promise<MaterialsResponseDto> {
    try {
      // 1. 查找工价项
      const workPriceItem = await this.workPriceItemRepository.findOne({
        where: { id: workPriceItemId },
        relations: ['order'],
      });

      if (!workPriceItem) {
        throw new HttpException('工价项不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 验证工价项是否属于该工匠
      if (workPriceItem.assigned_craftsman_id !== craftsmanId) {
        throw new HttpException(
          '无权查看此工价项的辅材',
          HttpStatus.FORBIDDEN,
        );
      }

      // 3. 确定要查询的订单ID
      // 如果工价项所在的订单有 parent_order_id，说明这是父订单（工长订单）
      // 需要查找对应的工匠订单来查询辅材
      let targetOrderId = workPriceItem.order_id;
      
      if (workPriceItem.order.parent_order_id === null) {
        // 工价项在父订单（工长订单）中，需要找到对应的工匠订单
        const craftsmanOrder = await this.orderRepository.findOne({
          where: {
            parent_order_id: workPriceItem.order_id,
            craftsman_user_id: craftsmanId,
            is_assigned: true,
          },
        });

        if (craftsmanOrder) {
          // 找到了对应的工匠订单，查询工匠订单的辅材
          targetOrderId = craftsmanOrder.id;
        } else {
          // 如果没有找到工匠订单，说明工价项还未分配给工匠，返回空列表
          return {
            commodity_list: [],
            total_price: 0,
          };
        }
      }
      // 如果工价项已经在工匠订单中（order.parent_order_id 不为 null），直接使用当前订单ID

      // 4. 查询该订单下的所有辅材
      const materials = await this.materialsRepository.find({
        where: { orderId: targetOrderId },
        order: { createdAt: 'DESC' },
      });

      // 4. 转换为商品列表格式
      const commodity_list: CommodityItemResponse[] = materials.map(
        (material) => ({
          id: material.id,
          commodity_id: material.commodity_id,
          commodity_name: material.commodity_name,
          commodity_price: Number(material.commodity_price),
          commodity_unit: material.commodity_unit,
          quantity: material.quantity,
          commodity_cover: material.commodity_cover || [],
          settlement_amount: Number(material.settlement_amount),
          is_paid: material.is_paid,
          is_accepted: material.is_accepted,
          createdAt: material.createdAt,
          updatedAt: material.updatedAt,
        }),
      );

      // 5. 计算总价（所有 settlement_amount 之和）
      const total_price = materials.reduce(
        (sum, material) => sum + Number(material.settlement_amount),
        0,
      );

      return {
        commodity_list,
        total_price: Number(total_price.toFixed(2)),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('查询辅材失败:', error);
      throw new HttpException(
        '查询辅材失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 工价项支付预览（微信下单前校验金额）
   */
  async getWorkPricePaymentPreview(params: {
    pay_type:
      | (typeof WX_PAY_CONFIG.payType)['WORK_PRICE_SINGLE']
      | (typeof WX_PAY_CONFIG.payType)['WORK_PRICE_BATCH'];
    workPriceItemId?: number;
    workPriceItemIds?: number[];
  }): Promise<{
    items: WorkPriceItem[];
    totalAmount: number;
    description: string;
    orderId: number;
  }> {
    const { pay_type, workPriceItemId, workPriceItemIds } = params;

    let items: WorkPriceItem[];
    if (pay_type === WX_PAY_CONFIG.payType.WORK_PRICE_SINGLE) {
      if (!workPriceItemId) {
        throw new HttpException(
          '单个支付需传入 workPriceItemId',
          HttpStatus.BAD_REQUEST,
        );
      }
      const item = await this.workPriceItemRepository.findOne({
        where: { id: workPriceItemId },
        relations: ['order'],
      });
      if (!item) {
        throw new HttpException('工价项不存在', HttpStatus.NOT_FOUND);
      }
      const singleTwins = await this.collectAssignedTwinWorkPriceItems(item);
      if (
        singleTwins.some((t) => t.order?.order_status === OrderStatus.CANCELLED)
      ) {
        throw new HttpException('订单已取消，无法支付', HttpStatus.BAD_REQUEST);
      }
      if (singleTwins.some((t) => t.is_paid)) {
        throw new HttpException(
          '该工价（含父/子单关联记录）已支付',
          HttpStatus.BAD_REQUEST,
        );
      }
      items = [item];
    } else {
      if (!workPriceItemIds?.length) {
        throw new HttpException(
          '批量支付需传入 workPriceItemIds',
          HttpStatus.BAD_REQUEST,
        );
      }
      items = await this.workPriceItemRepository.find({
        where: { id: In(workPriceItemIds) },
        relations: ['order'],
      });
      const foundIds = items.map((i) => i.id);
      const notFound = workPriceItemIds.filter((id) => !foundIds.includes(id));
      if (notFound.length > 0) {
        throw new HttpException(
          `工价项ID不存在: ${notFound.join(', ')}`,
          HttpStatus.NOT_FOUND,
        );
      }
      const orderIds = [...new Set(items.map((i) => i.order_id))];
      if (orderIds.length > 1) {
        throw new HttpException(
          '所选工价项必须属于同一订单',
          HttpStatus.BAD_REQUEST,
        );
      }
      for (const i of items) {
        const g = await this.collectAssignedTwinWorkPriceItems(i);
        if (g.some((t) => t.order?.order_status === OrderStatus.CANCELLED)) {
          throw new HttpException('订单已取消，无法支付', HttpStatus.BAD_REQUEST);
        }
        if (g.some((t) => t.is_paid)) {
          throw new HttpException(
            `工价项 ${i.id}（含父/子单关联）已支付，无法重复支付`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      const unpaid = items.filter((i) => !i.is_paid);
      if (unpaid.length === 0) {
        throw new HttpException('所选工价项均已支付', HttpStatus.BAD_REQUEST);
      }
      items = unpaid;
    }

    const resolvedOrderId = items[0].order_id;
    const totalAmount = items
      .reduce(
        (sum, i) => sum.plus(i.settlement_amount ?? i.calculateSettlementAmount()),
        new Decimal(0),
      )
      .toDecimalPlaces(2)
      .toNumber();

    const description =
      pay_type === WX_PAY_CONFIG.payType.WORK_PRICE_SINGLE
        ? `工价-${items[0].work_title}`
        : `工价批量支付-订单${resolvedOrderId}`;

    return { items, totalAmount, description, orderId: resolvedOrderId };
  }

  /**
   * 分配工匠后：父单工价项与子单副本是两条记录（不同 id）。
   * 支付需把这一组视为同一笔工价，预览/回调都按「组」处理。
   */
  private async collectAssignedTwinWorkPriceItems(
    item: WorkPriceItem,
  ): Promise<WorkPriceItem[]> {
    const withOrder =
      item.order != null
        ? item
        : await this.workPriceItemRepository.findOne({
            where: { id: item.id },
            relations: ['order'],
          });
    if (!withOrder?.order) {
      return [withOrder || item];
    }

    const byId = new Map<number, WorkPriceItem>();
    const add = (w: WorkPriceItem | null) => {
      if (w) byId.set(w.id, w);
    };
    add(withOrder);

    const ord = withOrder.order;

    if (ord.parent_order_id != null && ord.craftsman_user_id != null) {
      const parentRow = await this.workPriceItemRepository.findOne({
        where: {
          order_id: ord.parent_order_id,
          work_price_id: withOrder.work_price_id,
          assigned_craftsman_id: ord.craftsman_user_id,
        },
        relations: ['order'],
      });
      add(parentRow);
      return [...byId.values()];
    }

    if (withOrder.assigned_craftsman_id) {
      const childOrders = await this.orderRepository.find({
        where: {
          parent_order_id: ord.id,
          craftsman_user_id: withOrder.assigned_craftsman_id,
          is_assigned: true,
        },
        select: ['id'],
      });
      for (const co of childOrders) {
        const copy = await this.workPriceItemRepository.findOne({
          where: {
            order_id: co.id,
            work_price_id: withOrder.work_price_id,
          },
          relations: ['order'],
        });
        add(copy);
      }
    }

    return [...byId.values()];
  }

  /**
   * 微信回调：按工价项 id 定位，并把父/子关联行一并标记已付（幂等）
   */
  async confirmPaymentByWorkPriceItemId(workPriceItemId: number): Promise<null> {
    const id = Number(workPriceItemId);
    if (!Number.isFinite(id)) {
      throw new HttpException('工价项ID无效', HttpStatus.BAD_REQUEST);
    }
    const item = await this.workPriceItemRepository.findOne({
      where: { id },
      relations: ['order'],
    });
    if (!item) {
      throw new HttpException('工价项不存在', HttpStatus.NOT_FOUND);
    }

    const twins = await this.collectAssignedTwinWorkPriceItems(item);
    for (const t of twins) {
      if (t.order?.order_status === OrderStatus.CANCELLED) {
        throw new HttpException(
          '订单已取消，无法进行支付操作',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const unpaid = twins.filter((t) => !t.is_paid);
    if (unpaid.length === 0) {
      return null;
    }
    unpaid.forEach((t) => {
      t.is_paid = true;
    });
    await this.workPriceItemRepository.save(unpaid);
    return null;
  }

  /**
   * 微信回调：批量；每条 id 展开为父/子组后去重，再统一标记已付（幂等）
   */
  async batchConfirmPaymentByWorkPriceItemIds(
    workPriceItemIds: number[],
  ): Promise<null> {
    const items = await this.workPriceItemRepository.find({
      where: { id: In(workPriceItemIds) },
      relations: ['order'],
    });
    if (!items?.length) {
      throw new HttpException('未找到指定的工价项', HttpStatus.NOT_FOUND);
    }
    const foundIds = items.map((i) => i.id);
    const notFoundIds = workPriceItemIds.filter((id) => !foundIds.includes(id));
    if (notFoundIds.length > 0) {
      throw new HttpException(
        `以下工价项ID不存在: ${notFoundIds.join(', ')}`,
        HttpStatus.NOT_FOUND,
      );
    }

    const expandedIds = new Set<number>();
    for (const i of items) {
      const twins = await this.collectAssignedTwinWorkPriceItems(i);
      for (const t of twins) expandedIds.add(t.id);
    }

    const expanded = await this.workPriceItemRepository.find({
      where: { id: In([...expandedIds]) },
      relations: ['order'],
    });

    for (const t of expanded) {
      if (t.order.order_status === OrderStatus.CANCELLED) {
        throw new HttpException(
          `工价项ID ${t.id}: 订单已取消，无法进行支付操作`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const unpaid = expanded.filter((t) => !t.is_paid);
    if (unpaid.length === 0) {
      return null;
    }
    unpaid.forEach((t) => {
      t.is_paid = true;
    });
    await this.workPriceItemRepository.save(unpaid);
    return null;
  }

  /**
   * 子工价平台服务费：微信预下单（按工价项 id 列表，金额=各条 total_service_fee 之和）
   */
  async getSubWorkPriceServiceFeePaymentPreview(workPriceItemIds: number[]): Promise<{
    items: WorkPriceItem[];
    totalAmount: number;
    description: string;
    orderId: number;
  }> {
    if (!workPriceItemIds?.length) {
      throw new HttpException(
        '批量支付需传入 workPriceItemIds',
        HttpStatus.BAD_REQUEST,
      );
    }
    const items = await this.workPriceItemRepository.find({
      where: { id: In(workPriceItemIds) },
      relations: ['order'],
    });
    const foundIds = items.map((i) => i.id);
    const notFound = workPriceItemIds.filter((id) => !foundIds.includes(id));
    if (notFound.length > 0) {
      throw new HttpException(
        `工价项ID不存在: ${notFound.join(', ')}`,
        HttpStatus.NOT_FOUND,
      );
    }
    const orderIds = [...new Set(items.map((i) => i.order_id))];
    if (orderIds.length > 1) {
      throw new HttpException(
        '所选工价项必须属于同一订单',
        HttpStatus.BAD_REQUEST,
      );
    }

    for (const i of items) {
      if (!i.work_group_id || i.work_group_id <= 1) {
        throw new HttpException(
          `工价项 ${i.id} 非子工价（work_group_id>1），不能按子工价平台服务费支付`,
          HttpStatus.BAD_REQUEST,
        );
      }
      const group = await this.collectAssignedTwinWorkPriceItems(i);
      if (group.some((t) => t.order?.order_status === OrderStatus.CANCELLED)) {
        throw new HttpException('订单已取消，无法支付', HttpStatus.BAD_REQUEST);
      }
      if (group.some((t) => t.total_service_fee_is_paid)) {
        throw new HttpException(
          `工价项 ${i.id}（含父/子关联）的平台服务费已支付`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // 服务费为 0 的项不参与金额汇总，回调时仍会把 total_service_fee_is_paid 置为 true
    const totalAmount = items
      .reduce((sum, i) => {
        let fee = i.total_service_fee;
        if (!fee || Number(fee) === 0) {
          fee = i.calculateServiceFee();
        }
        const n = Number(fee) || 0;
        if (n >= 0.01) {
          return sum.plus(n);
        }
        return sum;
      }, new Decimal(0))
      .toDecimalPlaces(2)
      .toNumber();

    const orderId = items[0].order_id;
    const description = `子工价平台服务费-订单${orderId}`;

    return { items, totalAmount, description, orderId };
  }

  /**
   * 微信回调：子工价平台服务费已付（父/子关联行一并处理，幂等）
   */
  async batchConfirmSubWorkPriceServiceFeeByWorkPriceItemIds(
    workPriceItemIds: number[],
  ): Promise<null> {
    const items = await this.workPriceItemRepository.find({
      where: { id: In(workPriceItemIds) },
      relations: ['order'],
    });
    if (!items?.length) {
      throw new HttpException('未找到指定的工价项', HttpStatus.NOT_FOUND);
    }
    const foundIds = items.map((i) => i.id);
    const notFoundIds = workPriceItemIds.filter((id) => !foundIds.includes(id));
    if (notFoundIds.length > 0) {
      throw new HttpException(
        `以下工价项ID不存在: ${notFoundIds.join(', ')}`,
        HttpStatus.NOT_FOUND,
      );
    }

    const expandedIds = new Set<number>();
    for (const i of items) {
      const twins = await this.collectAssignedTwinWorkPriceItems(i);
      for (const t of twins) expandedIds.add(t.id);
    }

    const expanded = await this.workPriceItemRepository.find({
      where: { id: In([...expandedIds]) },
      relations: ['order'],
    });

    for (const t of expanded) {
      if (t.order.order_status === OrderStatus.CANCELLED) {
        throw new HttpException(
          `工价项ID ${t.id}: 订单已取消，无法进行支付操作`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const toSave: WorkPriceItem[] = [];
    for (const row of expanded) {
      if (!row.work_group_id || row.work_group_id <= 1) {
        continue;
      }
      if (row.total_service_fee_is_paid) {
        continue;
      }
      if (!row.total_service_fee || Number(row.total_service_fee) === 0) {
        row.total_service_fee = row.calculateServiceFee();
      }
      const fee = Number(row.total_service_fee) || 0;
      row.total_service_fee_is_paid = true;
      toSave.push(row);
      if (fee >= 0.01) {
        try {
          await this.platformIncomeRecordService.create({
            orderId: row.order_id,
            order_no: row.order.order_no,
            cost_type: CostType.SERVICE_FEE,
            cost_amount: fee,
          });
        } catch (recordError) {
          console.error(
            `[子工价服务费] 创建平台收支记录失败 workPriceItemId=${row.id}:`,
            recordError,
          );
        }
      }
    }

    if (toSave.length > 0) {
      await this.workPriceItemRepository.save(toSave);
    }
    return null;
  }
}

