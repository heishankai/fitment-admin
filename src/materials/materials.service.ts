import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Materials } from './materials.entity';
import { CreateMaterialsDto } from './dto/create-materials.dto';
import { AcceptMaterialsDto } from './dto/accept-materials.dto';
import { MaterialsResponseDto, CommodityItemResponse } from './dto/materials-response.dto';
import { Order } from '../order/order.entity';
import { OrderStatus } from '../order/order.entity';
import { PlatformIncomeRecordService } from '../platform-income-record/platform-income-record.service';
import { CostType } from '../platform-income-record/platform-income-record.entity';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Materials)
    private readonly materialsRepository: Repository<Materials>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly platformIncomeRecordService: PlatformIncomeRecordService,
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

      // 9. 返回null，全局拦截器会自动包装成标准响应
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

}
