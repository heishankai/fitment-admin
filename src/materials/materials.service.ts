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
import { ConfirmMaterialsPaymentDto } from './dto/confirm-payment.dto';
import { Order } from '../order/order.entity';
import { OrderStatus } from '../order/order.entity';
import { PlatformIncomeRecordService } from '../platform-income-record/platform-income-record.service';

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
   * @returns 辅材列表
   */
  async findByOrderId(orderId: number): Promise<Materials[]> {
    try {
      // 验证订单是否存在
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 查询该订单的所有辅材
      return await this.materialsRepository.find({
        where: { orderId },
        order: { createdAt: 'DESC' },
      });
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
   * @returns 创建的辅材
   */
  async create(
    createDto: CreateMaterialsDto,
    craftsmanUserId: number,
  ): Promise<Materials> {
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

      // 3. 验证订单状态（只有已接单的订单才能添加辅材）
      if (order.order_status !== OrderStatus.ACCEPTED) {
        throw new HttpException(
          '只有已接单的订单才能添加辅材',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 4. 创建辅材记录
      const materials = this.materialsRepository.create({
        orderId: createDto.orderId,
        total_price: createDto.total_price,
        is_paid: false, // 默认未付款
        total_is_accepted: false, // 默认未验收
        commodity_list: createDto.commodity_list.map((item) => ({
          id: item.id,
          commodity_name: item.commodity_name,
          commodity_price: item.commodity_price,
          commodity_unit: item.commodity_unit,
          quantity: item.quantity,
          commodity_cover: item.commodity_cover || [],
        })),
      });

      const saved = await this.materialsRepository.save(materials);

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

      // 2. 验证订单是否有接单的工匠
      if (!materials.order.craftsman_user_id) {
        throw new HttpException(
          '订单尚未接单，无法验收',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 3. 检查是否已付款
      if (materials.is_paid !== true) {
        throw new HttpException(
          '辅材尚未付款，请联系平台付款',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 4. 检查是否已经验收过
      if (materials.total_is_accepted === true) {
        throw new HttpException(
          '辅材已经验收过，无法重复验收',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 5. 设置验收状态（注意：辅材验收不打款）
      materials.total_is_accepted = true;

      // 6. 保存辅材
      await this.materialsRepository.save(materials);

      // 7. 返回null，全局拦截器会自动包装成标准响应
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
   * 确认辅材支付
   * @param confirmDto 确认支付信息
   * @returns null，由全局拦截器包装成标准响应
   */
  async confirmPayment(
    confirmDto: ConfirmMaterialsPaymentDto,
  ): Promise<null> {
    try {
      // 1. 查找辅材
      const materials = await this.materialsRepository.findOne({
        where: { id: confirmDto.materialsId },
        relations: ['order'],
      });

      if (!materials) {
        throw new HttpException('辅材不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 检查是否已经付款
      if (materials.is_paid === true) {
        throw new HttpException(
          '辅材已经付款，无法重复支付',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 3. 设置付款状态
      materials.is_paid = true;

      // 4. 保存辅材
      await this.materialsRepository.save(materials);

      // 5. 创建平台收支记录（收入：辅材费用）
      try {
        await this.platformIncomeRecordService.create({
          orderId: materials.orderId,
          materials_cost: materials.total_price,
          total_service_fee: 0, // 辅材费用不包含服务费，服务费在工价中
        });
      } catch (recordError) {
        // 记录错误但不影响支付流程
        console.error('创建平台收支记录失败:', recordError);
      }

      // 6. 返回null，全局拦截器会自动包装成标准响应
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
