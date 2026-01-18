import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletTransaction, WalletTransactionType } from './wallet-transaction.entity';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';
import { QueryWalletTransactionDto } from './dto/query-wallet-transaction.dto';

@Injectable()
export class WalletTransactionService {
  constructor(
    @InjectRepository(WalletTransaction)
    private readonly transactionRepository: Repository<WalletTransaction>,
  ) {}

  /**
   * 创建账户明细
   * @param createDto 账户明细信息
   * @returns 创建的账户明细
   */
  async create(createDto: CreateWalletTransactionDto): Promise<WalletTransaction> {
    try {
      const transaction = this.transactionRepository.create(createDto);
      return await this.transactionRepository.save(transaction);
    } catch (error) {
      console.error('创建账户明细失败:', error);
      throw new HttpException(
        '创建账户明细失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 查询账户明细列表
   * @param queryDto 查询参数
   * @returns 查询结果
   */
  async getTransactions(queryDto: QueryWalletTransactionDto): Promise<any> {
    try {
      const {
        craftsman_user_id,
        type,
        order_id,
      } = queryDto;

      // 创建查询构建器
      const query = this.transactionRepository
        .createQueryBuilder('transaction')
        .leftJoinAndSelect('transaction.craftsman_user', 'craftsman_user');

      // 添加筛选条件：用户ID
      if (craftsman_user_id) {
        query.andWhere('transaction.craftsman_user_id = :craftsman_user_id', {
          craftsman_user_id,
        });
      }

      // 添加筛选条件：类型
      if (type !== undefined && type !== null) {
        query.andWhere('transaction.type = :type', { type });
      }

      // 添加筛选条件：订单ID
      if (order_id) {
        query.andWhere('transaction.order_id = :order_id', { order_id });
      }

      // 按创建时间倒序排列
      query.orderBy('transaction.createdAt', 'DESC');

      // 查询数据
      const data = await query.getMany();

      // 格式化返回数据
      const formattedData = data.map((transaction) => ({
        id: transaction.id,
        craftsman_user: transaction.craftsman_user
          ? {
              id: transaction.craftsman_user.id,
              nickname: transaction.craftsman_user.nickname,
              phone: transaction.craftsman_user.phone,
              avatar: transaction.craftsman_user.avatar,
            }
          : null,
        amount: Number(transaction.amount),
        type: transaction.type,
        type_text: transaction.type === WalletTransactionType.INCOME ? '收入' : '支出',
        description: transaction.description,
        order_id: transaction.order_id,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      }));

      // 返回结果
      return {
        success: true,
        data: formattedData,
        code: 200,
        message: null,
      };
    } catch (error) {
      console.error('查询账户明细错误:', error);
      return {
        success: false,
        data: null,
        code: 500,
        message: '查询失败: ' + error.message,
      };
    }
  }

  /**
   * 查询当前用户的账户明细列表
   * @param craftsmanUserId 工匠用户ID
   * @param queryDto 查询参数
   * @returns 账户明细列表
   */
  async getMyTransactions(
    craftsmanUserId: number,
    queryDto?: QueryWalletTransactionDto,
  ): Promise<any> {
    try {
      const { type, order_id } = queryDto || {};

      // 创建查询构建器
      const query = this.transactionRepository
        .createQueryBuilder('transaction')
        .leftJoinAndSelect('transaction.craftsman_user', 'craftsman_user')
        .where('transaction.craftsman_user_id = :craftsman_user_id', {
          craftsman_user_id: craftsmanUserId,
        });

      // 添加筛选条件：类型
      if (type !== undefined && type !== null) {
        query.andWhere('transaction.type = :type', { type });
      }

      // 添加筛选条件：订单ID
      if (order_id) {
        query.andWhere('transaction.order_id = :order_id', { order_id });
      }

      // 排除"申请提现中"的记录
      query.andWhere('transaction.description != :withdrawPending', {
        withdrawPending: '申请提现中',
      });

      // 按创建时间倒序排列
      query.orderBy('transaction.createdAt', 'DESC');

      const data = await query.getMany();

      // 格式化返回数据
      const formattedData = data.map((transaction) => ({
        id: transaction.id,
        craftsman_user: transaction.craftsman_user
          ? {
              id: transaction.craftsman_user.id,
              nickname: transaction.craftsman_user.nickname,
              phone: transaction.craftsman_user.phone,
              avatar: transaction.craftsman_user.avatar,
            }
          : null,
        amount: Number(transaction.amount),
        type: transaction.type,
        type_text: transaction.type === WalletTransactionType.INCOME ? '收入' : '支出',
        description: transaction.description,
        order_id: transaction.order_id,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      }));

      return {
        success: true,
        data: formattedData,
        code: 200,
        message: null,
      };
    } catch (error) {
      console.error('查询账户明细失败:', error);
      throw new HttpException(
        '查询账户明细失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
