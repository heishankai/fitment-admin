import {
  Injectable,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Materials } from './materials.entity';
import { CreateMaterialsDto } from './dto/create-materials.dto';
import { AcceptMaterialsDto } from './dto/accept-materials.dto';
import { MaterialsResponseDto, CommodityItemResponse } from './dto/materials-response.dto';
import { BatchPaymentMaterialsDto } from './dto/batch-payment.dto';
import { BatchAcceptMaterialsDto } from './dto/batch-accept.dto';
import { Order } from '../order/order.entity';
import { OrderStatus } from '../order/order.entity';
import { PlatformIncomeRecordService } from '../platform-income-record/platform-income-record.service';
import { CostType } from '../platform-income-record/platform-income-record.entity';
import { OrderService } from '../order/order.service';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Materials)
    private readonly materialsRepository: Repository<Materials>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly platformIncomeRecordService: PlatformIncomeRecordService,
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
  ) {}

  /**
   * 根据订单ID查询辅材列表
   * @param orderId 订单ID
   * @returns 辅材响应数据（包含商品列表和总价）
   */
  async findByOrderId(orderId: number): Promise<MaterialsResponseDto> {
    try {
      // 验证订单是否存在
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 查询该订单的所有辅材
      const materials = await this.materialsRepository.find({
        where: { orderId },
        order: { createdAt: 'DESC' },
      });

      // 转换为商品列表格式
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

      // 计算总价（所有 settlement_amount 之和）
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
   * 创建辅材
   * @param createDto 辅材信息
   * @param craftsmanUserId 工匠用户ID（用于验证订单是否属于该工匠）
   * @returns 创建的辅材列表
   */
  async create(
    createDto: CreateMaterialsDto,
    craftsmanUserId: number,
  ): Promise<Materials[]> {
    try {
      // 1. 查找订单
      const order = await this.orderRepository.findOne({
        where: { id: createDto.orderId },
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

      // 3. 验证订单状态（只有已接单的订单才能添加辅材，已完成和已取消的订单不允许）
      if (order.order_status === OrderStatus.COMPLETED) {
        throw new HttpException(
          '订单已完成，无法添加辅材',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (order.order_status === OrderStatus.CANCELLED) {
        throw new HttpException(
          '订单已取消，无法添加辅材',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (order.order_status !== OrderStatus.ACCEPTED) {
        throw new HttpException(
          '只有已接单的订单才能添加辅材',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 4. 批量创建辅材记录
      const materialsList = createDto.commodity_list.map((item) => {
        const commodityPrice = parseFloat(item.commodity_price);
        const quantity = item.quantity;
        const settlementAmount = commodityPrice * quantity;

        return this.materialsRepository.create({
          orderId: createDto.orderId,
          is_paid: false, // 默认未付款
          is_accepted: false, // 默认未验收
          commodity_id: item.commodity_id || item.id, // 兼容 id 字段
          commodity_name: item.commodity_name,
          commodity_price: commodityPrice,
          commodity_unit: item.commodity_unit,
          quantity: quantity,
          commodity_cover: item.commodity_cover || [],
          settlement_amount: settlementAmount, // 结算结果
        });
      });

      const saved = await this.materialsRepository.save(materialsList);

      return saved;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('创建辅材失败:', error);
      throw new HttpException(
        '创建辅材失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 验收辅材
   * @param acceptDto 验收信息
   * @returns null，由全局拦截器包装成标准响应
   */
  async accept(acceptDto: AcceptMaterialsDto): Promise<null> {
    try {
      // 1. 查找辅材
      const materials = await this.materialsRepository.findOne({
        where: { id: acceptDto.materialsId },
        relations: ['order'],
      });

      if (!materials) {
        throw new HttpException('辅材不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 检查订单是否已取消
      if (materials.order.order_status === OrderStatus.CANCELLED) {
        throw new HttpException(
          '订单已取消，无法进行验收操作',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 3. 验证订单是否有接单的工匠
      if (!materials.order.craftsman_user_id) {
        throw new HttpException(
          '订单尚未接单，无法验收',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 4. 检查是否已付款
      if (materials.is_paid !== true) {
        throw new HttpException(
          '辅材尚未付款，请联系平台付款',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 5. 检查是否已经验收过
      if (materials.is_accepted === true) {
        throw new HttpException(
          '辅材已经验收过，无法重复验收',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 6. 设置验收状态
      materials.is_accepted = true;

      // 7. 保存辅材
      await this.materialsRepository.save(materials);

      // 8. 注意：平台收支记录已在确认支付时创建，验收时不再重复创建

      // 9. 验收辅材后，检查订单是否完成
      const orderId = materials.orderId;
      console.log(`验收辅材 ${acceptDto.materialsId} 成功，检查订单 ${orderId} 是否完成...`);
      await this.orderService.handleOrderCompletionAfterAcceptance(orderId);

      // 10. 返回null，全局拦截器会自动包装成标准响应
      return null;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('验收辅材失败:', error);
      throw new HttpException(
        '验收辅材失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 确认辅材支付（通过ID）
   * @param materialsId 辅材ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async confirmPaymentById(materialsId: number): Promise<null> {
    try {
      // 1. 查找辅材
      const materials = await this.materialsRepository.findOne({
        where: { id: materialsId },
        relations: ['order'],
      });

      if (!materials) {
        throw new HttpException('辅材不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 检查订单是否已取消
      if (materials.order.order_status === OrderStatus.CANCELLED) {
        throw new HttpException(
          '订单已取消，无法进行支付操作',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 3. 检查是否已经付款
      if (materials.is_paid === true) {
        throw new HttpException(
          '辅材已经付款，无法重复支付',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 4. 设置付款状态
      materials.is_paid = true;

      // 5. 保存辅材
      await this.materialsRepository.save(materials);

      // 6. 创建平台收支记录（辅材费用）
      try {
        await this.platformIncomeRecordService.create({
          orderId: materials.orderId,
          order_no: materials.order.order_no,
          cost_type: CostType.MATERIALS,
          cost_amount: Number(materials.settlement_amount),
        });
      } catch (recordError) {
        // 记录错误但不影响支付确认流程
        console.error('创建平台收支记录失败:', recordError);
      }

      // 7. 返回null，全局拦截器会自动包装成标准响应
      return null;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('确认辅材支付失败:', error);
      throw new HttpException(
        '确认辅材支付失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 一键支付：批量确认订单下所有未支付的辅材
   * @param orderId 订单ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async batchConfirmPaymentByOrderId(orderId: number): Promise<null> {
    try {
      // 1. 查找订单
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
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

      // 3. 查找该订单下所有未支付的辅材
      const unpaidMaterials = await this.materialsRepository.find({
        where: {
          orderId: orderId,
          is_paid: false,
        },
        relations: ['order'],
      });

      if (!unpaidMaterials || unpaidMaterials.length === 0) {
        throw new HttpException(
          '该订单下没有未支付的辅材',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 4. 批量更新支付状态
      unpaidMaterials.forEach((material) => {
        material.is_paid = true;
      });

      await this.materialsRepository.save(unpaidMaterials);

      // 5. 为每个辅材创建平台收支记录
      const recordPromises = unpaidMaterials.map((material) => {
        return this.platformIncomeRecordService
          .create({
            orderId: material.orderId,
            order_no: material.order.order_no,
            cost_type: CostType.MATERIALS,
            cost_amount: Number(material.settlement_amount),
          })
          .catch((recordError) => {
            // 记录错误但不影响支付确认流程
            console.error(
              `创建平台收支记录失败 (辅材ID: ${material.id}):`,
              recordError,
            );
          });
      });

      await Promise.all(recordPromises);

      // 6. 返回null，全局拦截器会自动包装成标准响应
      return null;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('一键支付辅材失败:', error);
      throw new HttpException(
        '一键支付辅材失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 一键验收：批量验收指定的辅材（通过辅材ID列表）
   * @param materialsIds 辅材ID列表
   * @returns null，由全局拦截器包装成标准响应
   */
  async batchAcceptByMaterialsIds(materialsIds: number[]): Promise<null> {
    try {
      // 1. 查找所有指定的辅材
      const materials = await this.materialsRepository.find({
        where: {
          id: In(materialsIds),
        },
        relations: ['order'],
      });

      if (!materials || materials.length === 0) {
        throw new HttpException('未找到指定的辅材', HttpStatus.NOT_FOUND);
      }

      // 2. 检查是否有不存在的辅材ID
      const foundIds = materials.map((m) => m.id);
      const notFoundIds = materialsIds.filter((id) => !foundIds.includes(id));
      if (notFoundIds.length > 0) {
        throw new HttpException(
          `以下辅材ID不存在: ${notFoundIds.join(', ')}`,
          HttpStatus.NOT_FOUND,
        );
      }

      // 3. 验证所有辅材是否属于同一个订单（可选，但建议统一）
      const orderIds = [...new Set(materials.map((m) => m.orderId))];
      if (orderIds.length > 1) {
        // 允许不同订单的辅材一起验收，但记录警告
        console.warn(
          `批量验收包含多个订单的辅材: ${orderIds.join(', ')}`,
        );
      }

      // 4. 检查订单状态和验证条件
      const invalidMaterials: string[] = [];
      const validMaterials: Materials[] = [];

      for (const material of materials) {
        // 检查订单是否已取消
        if (material.order.order_status === OrderStatus.CANCELLED) {
          invalidMaterials.push(
            `辅材ID ${material.id}: 订单已取消，无法进行验收操作`,
          );
          continue;
        }

        // 验证订单是否有接单的工匠
        if (!material.order.craftsman_user_id) {
          invalidMaterials.push(
            `辅材ID ${material.id}: 订单尚未接单，无法验收`,
          );
          continue;
        }

        // 检查是否已付款（新增：全部必须已支付）
        if (material.is_paid !== true) {
          invalidMaterials.push(
            `辅材ID ${material.id}: 辅材尚未付款，无法验收`,
          );
          continue;
        }

        // 检查是否已经验收过
        if (material.is_accepted === true) {
          invalidMaterials.push(
            `辅材ID ${material.id}: 辅材已经验收过，无法重复验收`,
          );
          continue;
        }

        validMaterials.push(material);
      }

      // 5. 如果有无效的辅材，返回错误信息
      if (invalidMaterials.length > 0) {
        throw new HttpException(
          invalidMaterials.join('; '),
          HttpStatus.BAD_REQUEST,
        );
      }

      // 6. 如果没有有效的辅材可以验收
      if (validMaterials.length === 0) {
        throw new HttpException(
          '没有可以验收的辅材',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 7. 批量更新验收状态
      validMaterials.forEach((material) => {
        material.is_accepted = true;
      });

      await this.materialsRepository.save(validMaterials);

      // 8. 验收所有辅材后，检查所有受影响的订单是否完成
      const affectedOrderIds = [...new Set(validMaterials.map((m) => m.orderId))];
      console.log(`批量验收辅材完成，检查 ${affectedOrderIds.length} 个订单是否完成...`);
      
      for (const orderId of affectedOrderIds) {
        try {
          await this.orderService.handleOrderCompletionAfterAcceptance(orderId);
        } catch (error) {
          console.error(`检查订单 ${orderId} 完成状态失败:`, error);
        }
      }

      // 9. 返回null，全局拦截器会自动包装成标准响应
      return null;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('一键验收辅材失败:', error);
      throw new HttpException(
        '一键验收辅材失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 一键验收：按订单ID验收该订单下的所有辅材（必须全部已支付）
   * @param orderId 订单ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async batchAcceptByOrderId(orderId: number): Promise<null> {
    try {
      // 1. 查找订单
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 检查订单是否已取消
      if (order.order_status === OrderStatus.CANCELLED) {
        throw new HttpException(
          '订单已取消，无法进行验收操作',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 3. 查找该订单下所有辅材
      const allMaterials = await this.materialsRepository.find({
        where: {
          orderId: orderId,
        },
        relations: ['order'],
      });

      if (!allMaterials || allMaterials.length === 0) {
        throw new HttpException(
          '该订单下没有辅材',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 4. 检查所有辅材是否已支付
      const unpaidMaterials = allMaterials.filter((m) => !m.is_paid);
      if (unpaidMaterials.length > 0) {
        throw new HttpException(
          `有 ${unpaidMaterials.length} 个辅材尚未支付，无法验收。请先完成所有辅材的支付。`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // 5. 分离验收条件
      const invalidMaterials: string[] = [];
      const validMaterials: Materials[] = [];

      for (const material of allMaterials) {
        // 验证订单是否有接单的工匠
        if (!material.order.craftsman_user_id) {
          invalidMaterials.push(
            `辅材ID ${material.id}: 订单尚未接单，无法验收`,
          );
          continue;
        }

        // 检查是否已经验收过
        if (material.is_accepted === true) {
          console.log(`辅材ID ${material.id}: 已经验收过，跳过`);
          continue; // 跳过已验收的，不影响其他辅材验收
        }

        validMaterials.push(material);
      }

      // 6. 如果有验收错误（除了已验收），返回错误信息
      if (invalidMaterials.length > 0) {
        throw new HttpException(
          invalidMaterials.join('; '),
          HttpStatus.BAD_REQUEST,
        );
      }

      // 7. 如果没有需要验收的辅材
      if (validMaterials.length === 0) {
        throw new HttpException(
          '该订单的所有辅材都已验收或不需要验收',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 8. 批量更新验收状态
      validMaterials.forEach((material) => {
        material.is_accepted = true;
      });

      await this.materialsRepository.save(validMaterials);

      console.log(`订单 ${orderId} 一键验收 ${validMaterials.length} 个辅材成功`);

      // 9. 验收辅材后，检查订单是否完成
      await this.orderService.handleOrderCompletionAfterAcceptance(orderId);

      // 10. 返回null，全局拦截器会自动包装成标准响应
      return null;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('按订单ID一键验收辅材失败:', error);
      throw new HttpException(
        '按订单ID一键验收辅材失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
