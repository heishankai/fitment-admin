import { Injectable } from '@nestjs/common';
import { CreateOrderAccessFeeDto } from './dto/create-order-access-fee.dto';
import { UpdateOrderAccessFeeDto } from './dto/update-order-access-fee.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderAccessFee } from './entities/order-access-fee.entity';

@Injectable()
export class OrderAccessFeeService {
  constructor(
    @InjectRepository(OrderAccessFee)
    private readonly orderAccessFeeRepository: Repository<OrderAccessFee>,
  ) {}

  /**
   * 创建订单
   * @param createOrderAccessFeeDto 创建订单DTO
   * @returns 创建结果
   */
  async create(createOrderAccessFeeDto: CreateOrderAccessFeeDto) {
    const newOrderAccessFee = this.orderAccessFeeRepository.create(
      createOrderAccessFeeDto,
    );
    await this.orderAccessFeeRepository.save(newOrderAccessFee);

    return 'This action adds a new orderAccessFee';
  }
  /**
   * 根据用户id查询订单(未支付,未过期,未使用)
   * @param userId 用户ID
   * @returns 订单
   */
  async findByUserIdNotPayNotExpired(userId: number) {
    return await this.orderAccessFeeRepository.findOne({
      where: { user_id: userId, status: 0, is_expired: 0, is_used: 0 },
    });
  }
  /**
   * 根据用户id查询订单（已支付，未使用）
   * @param userId 用户ID
   * @returns 订单
   */
  async findByUserIdPayNotUsed(userId: number) {
    return await this.orderAccessFeeRepository.findOne({
      where: { user_id: userId, status: 1, is_used: 0 },
    });
  }

  /**
   * 订单设置过期
   * @param id 订单ID
   * @returns 结果
   */
  async setExpired(id: number) {
    await this.orderAccessFeeRepository.update(id, { is_expired: 1 });
    return null;
  }
  /**
   * 根据订单号设置订单已支付
   * @param orderNo 订单号
   * @returns 结果
   */
  async setPaidByOrderNo(orderNo: string) {
    await this.orderAccessFeeRepository.update(
      { order_no: orderNo },
      { status: 1 },
    );

    return null;
  }
  /**
   * 根据订单号设置订单已使用
   * @param orderNo 订单号
   * @returns 结果
   */
  async setUsedByOrderNo(orderNo: string, mainOrderId: number) {
    await this.orderAccessFeeRepository.update(
      { order_no: orderNo },
      { is_used: 1, main_order_id: mainOrderId },
    );
    return null;
  }

  findAll() {
    return `This action returns all orderAccessFee`;
  }

  findOne(id: number) {
    return `This action returns a #${id} orderAccessFee`;
  }

  update(id: number, updateOrderAccessFeeDto: UpdateOrderAccessFeeDto) {
    return `This action updates a #${id} orderAccessFee`;
  }

  remove(id: number) {
    return `This action removes a #${id} orderAccessFee`;
  }
}
