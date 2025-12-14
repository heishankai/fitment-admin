import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformIncomeRecord } from './platform-income-record.entity';
import { CreatePlatformIncomeRecordDto } from './dto/create-platform-income-record.dto';
import { Order } from '../order/order.entity';

@Injectable()
export class PlatformIncomeRecordService {
  constructor(
    @InjectRepository(PlatformIncomeRecord)
    private readonly platformIncomeRecordRepository: Repository<PlatformIncomeRecord>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  /**
   * 创建平台收支记录
   * @param createDto 收支记录信息
   * @returns 创建的收支记录
   */
  async create(
    createDto: CreatePlatformIncomeRecordDto,
  ): Promise<PlatformIncomeRecord> {
    try {
      // 1. 验证订单是否存在
      const order = await this.orderRepository.findOne({
        where: { id: createDto.orderId },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 2. 检查是否已存在该订单的记录
      const existingRecord = await this.platformIncomeRecordRepository.findOne({
        where: { orderId: createDto.orderId },
      });

      if (existingRecord) {
        // 如果已存在，更新记录（累加）
        existingRecord.materials_cost =
          (existingRecord.materials_cost || 0) +
          (createDto.materials_cost || 0);
        existingRecord.total_service_fee =
          (existingRecord.total_service_fee || 0) +
          (createDto.total_service_fee || 0);

        const updated = await this.platformIncomeRecordRepository.save(
          existingRecord,
        );
        return updated;
      }

      // 3. 创建新记录
      const record = this.platformIncomeRecordRepository.create({
        orderId: createDto.orderId,
        materials_cost: createDto.materials_cost || 0,
        total_service_fee: createDto.total_service_fee || 0,
      });

      const saved = await this.platformIncomeRecordRepository.save(record);

      return saved;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('创建平台收支记录失败:', error);
      throw new HttpException(
        '创建平台收支记录失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据订单ID查询平台收支记录
   * @param orderId 订单ID
   * @returns 平台收支记录
   */
  async findByOrderId(orderId: number): Promise<PlatformIncomeRecord | null> {
    try {
      // 验证订单是否存在
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new HttpException('订单不存在', HttpStatus.NOT_FOUND);
      }

      // 查询该订单的平台收支记录
      return await this.platformIncomeRecordRepository.findOne({
        where: { orderId },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('查询平台收支记录失败:', error);
      throw new HttpException(
        '查询平台收支记录失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 查询所有平台收支记录
   * @returns 平台收支记录列表
   */
  async findAll(): Promise<PlatformIncomeRecord[]> {
    try {
      return await this.platformIncomeRecordRepository.find({
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      console.error('查询平台收支记录失败:', error);
      throw new HttpException(
        '查询平台收支记录失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
