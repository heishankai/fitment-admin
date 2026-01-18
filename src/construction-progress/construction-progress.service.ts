import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConstructionProgress } from './construction-progress.entity';
import { CreateConstructionProgressDto } from './dto/create-construction-progress.dto';
import { Order } from '../order/order.entity';
import { OrderStatus } from '../order/order.entity';
import { WorkPriceItem } from '../work-price-item/work-price-item.entity';

@Injectable()
export class ConstructionProgressService {
  constructor(
    @InjectRepository(ConstructionProgress)
    private readonly constructionProgressRepository: Repository<ConstructionProgress>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(WorkPriceItem)
    private readonly workPriceItemRepository: Repository<WorkPriceItem>,
  ) {}

  /**
   * 根据订单ID查询施工进度列表
   * @param orderId 订单ID
   * @returns 施工进度列表
   */
  async findByOrderId(orderId: number): Promise<ConstructionProgress[]> {
    try {
      // 验证订单是否存在
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 查询该订单的所有施工进度
      return await this.constructionProgressRepository.find({
        where: { orderId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('查询施工进度失败:', error);
      throw new HttpException(
        '查询施工进度失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 创建施工进度（打卡）
   * @param createDto 施工进度信息
   * @param craftsmanUserId 工匠用户ID（用于验证订单是否属于该工匠）
   * @returns 创建的施工进度
   */
  async create(
    createDto: CreateConstructionProgressDto,
    craftsmanUserId: number,
  ): Promise<ConstructionProgress> {
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

      // 3. 验证订单状态（只有已接单的订单才能添加施工进度，已完成和已取消的订单不允许）
      if (order.order_status === OrderStatus.COMPLETED) {
        throw new HttpException(
          '订单已完成，无法添加施工进度',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (order.order_status === OrderStatus.CANCELLED) {
        throw new HttpException(
          '订单已取消，无法添加施工进度',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (order.order_status !== OrderStatus.ACCEPTED) {
        throw new HttpException(
          '只有已接单的订单才能添加施工进度',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 4. 创建施工进度记录
      const constructionProgress = this.constructionProgressRepository.create({
        orderId: createDto.orderId,
        start_time: createDto.start_time,
        end_time: createDto.end_time,
        location: createDto.location,
        photos: createDto.photos || [],
      });

      const saved = await this.constructionProgressRepository.save(
        constructionProgress,
      );

      return saved;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('创建施工进度失败:', error);
      throw new HttpException(
        '创建施工进度失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据工价项ID和工匠ID查询对应分配订单的施工进度
   * @param workPriceItemId 工价项ID
   * @param craftsmanId 工匠ID
   * @returns 施工进度列表
   */
  async findByWorkPriceItemIdAndCraftsmanId(
    workPriceItemId: number,
    craftsmanId: number,
  ): Promise<ConstructionProgress[]> {
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
          '无权查看此工价项的施工进度',
          HttpStatus.FORBIDDEN,
        );
      }

      // 3. 确定要查询的订单ID
      // 如果工价项所在的订单有 parent_order_id，说明这是父订单（工长订单）
      // 需要查找对应的工匠订单来查询施工进度
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
          // 找到了对应的工匠订单，查询工匠订单的施工进度
          targetOrderId = craftsmanOrder.id;
        } else {
          // 如果没有找到工匠订单，说明工价项还未分配给工匠，返回空列表
          return [];
        }
      }
      // 如果工价项已经在工匠订单中（order.parent_order_id 不为 null），直接使用当前订单ID

      // 4. 查询该订单的所有施工进度
      return await this.constructionProgressRepository.find({
        where: { orderId: targetOrderId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('查询施工进度失败:', error);
      throw new HttpException(
        '查询施工进度失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
