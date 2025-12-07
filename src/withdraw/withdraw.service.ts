import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdraw, WithdrawStatus } from './withdraw.entity';
import { QueryWithdrawDto } from './dto/query-withdraw.dto';
import { AuditWithdrawDto } from './dto/audit-withdraw.dto';
import { CreateWithdrawDto } from './dto/create-withdraw.dto';
import { WalletService } from '../wallet/wallet.service';
import { CraftsmanBankCard } from '../craftsman-bank-card/craftsman-bank-card.entity';
import { WalletTransactionService } from '../wallet-transaction/wallet-transaction.service';
import { WalletTransactionType } from '../wallet-transaction/wallet-transaction.entity';

@Injectable()
export class WithdrawService {
  constructor(
    @InjectRepository(Withdraw)
    private readonly withdrawRepository: Repository<Withdraw>,
    @InjectRepository(CraftsmanBankCard)
    private readonly bankCardRepository: Repository<CraftsmanBankCard>,
    private readonly walletService: WalletService,
    private readonly walletTransactionService: WalletTransactionService,
  ) {}

  /**
   * 分页查询提现申请列表
   * @param queryDto 查询参数
   * @returns 分页结果
   */
  async getWithdrawsByPage(queryDto: QueryWithdrawDto): Promise<any> {
    try {
      const {
        pageIndex = 1,
        pageSize = 10,
        craftsman_user_name = '',
        status,
      } = queryDto;

      // 创建查询构建器，关联用户和银行卡表
      const query = this.withdrawRepository
        .createQueryBuilder('withdraw')
        .leftJoinAndSelect('withdraw.craftsman_user', 'craftsman_user')
        .leftJoinAndSelect('withdraw.craftsman_bank_card', 'craftsman_bank_card');

      // 添加筛选条件：工匠用户名
      if (craftsman_user_name) {
        query.andWhere('craftsman_user.nickname LIKE :craftsman_user_name', {
          craftsman_user_name: `%${craftsman_user_name}%`,
        });
      }

      // 添加筛选条件：状态
      if (status !== undefined && status !== null) {
        query.andWhere('withdraw.status = :status', { status });
      }

      // 按创建时间倒序排列
      query.orderBy('withdraw.createdAt', 'DESC');

      // 查询总数
      const total = await query.getCount();

      // 查询数据（分页）
      const data = await query
        .skip((pageIndex - 1) * pageSize)
        .take(pageSize)
        .getMany();

      // 格式化返回数据，并获取用户的银行卡信息（如果提现记录中没有）
      const formattedData = await Promise.all(
        data.map(async (withdraw) => {
          // 优先使用提现记录中的银行卡，如果没有则查询用户的银行卡
          let bankCard: CraftsmanBankCard | null = withdraw.craftsman_bank_card;
          
          // 如果提现记录中没有银行卡，通过用户ID查询
          const userId = withdraw.craftsman_user_id || withdraw.craftsman_user?.id;
          if (!bankCard && userId) {
            try {
              bankCard = await this.bankCardRepository.findOne({
                where: { craftsman_user_id: userId },
              });
              console.log(`[提现查询] 用户ID: ${userId}, 银行卡查询结果:`, bankCard ? `找到(ID: ${bankCard.id})` : '未找到');
            } catch (error) {
              console.error(`[提现查询] 查询用户 ${userId} 银行卡失败:`, error);
            }
          } else if (bankCard) {
            console.log(`[提现查询] 提现记录中已有银行卡:`, bankCard.id);
          }

          return {
            id: withdraw.id,
            nickname: withdraw.craftsman_user?.nickname || '',
            phone: withdraw.craftsman_user?.phone || '',
            craftsman_user: withdraw.craftsman_user
              ? {
                  id: withdraw.craftsman_user.id,
                  nickname: withdraw.craftsman_user.nickname,
                  phone: withdraw.craftsman_user.phone,
                  avatar: withdraw.craftsman_user.avatar,
                }
              : null,
            craftsman_bank_card: bankCard
              ? {
                  id: bankCard.id,
                  bank_name: bankCard.bank_name,
                  card_number: bankCard.card_number,
                  bank_branch: bankCard.bank_branch,
                  name: bankCard.name,
                  phone: bankCard.phone,
                }
              : null,
            amount: Number(withdraw.amount),
            status: withdraw.status,
            createdAt: withdraw.createdAt,
            updatedAt: withdraw.updatedAt,
          };
        }),
      );

      // 返回结果（包含分页信息的完整格式）
      return {
        success: true,
        data: formattedData,
        code: 200,
        message: null,
        pageIndex,
        pageSize,
        total,
        pageTotal: Math.ceil(total / pageSize),
      };
    } catch (error) {
      console.error('分页查询提现申请错误:', error);
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
   * 申请提现
   * @param craftsmanUserId 工匠用户ID
   * @param createDto 申请提现信息
   * @returns 创建的提现申请
   */
  async createWithdraw(
    craftsmanUserId: number,
    createDto: CreateWithdrawDto,
  ): Promise<Withdraw> {
    try {
      const { amount } = createDto;

      // 验证提现金额
      if (amount <= 0) {
        throw new HttpException('提现金额必须大于0', HttpStatus.BAD_REQUEST);
      }

      // 获取钱包信息
      const wallet = await this.walletService.getWallet(craftsmanUserId);
      const balance = Number(wallet.balance) || 0;
      const freezeMoney = Number(wallet.freeze_money) || 0;

      // 查询所有待审核的提现申请，计算总冻结金额
      const allPendingWithdraws = await this.withdrawRepository.find({
        where: {
          craftsman_user_id: craftsmanUserId,
          status: WithdrawStatus.PENDING,
        },
      });

      const totalPendingAmount = allPendingWithdraws.reduce(
        (sum, w) => sum + Number(w.amount),
        0,
      );

      // 提现是从 balance 中扣除，需要确保 balance 足够
      // 已冻结的金额（freeze_money）不应该影响新的提现申请
      // 但需要确保 balance >= amount
      if (balance < amount) {
        const errorMsg = `余额不足，账户余额：¥${balance.toFixed(2)}，申请提现金额：¥${amount.toFixed(2)}${freezeMoney > 0 ? `（已冻结金额：¥${freezeMoney.toFixed(2)}）` : ''}${totalPendingAmount > 0 ? `（待审核提现：¥${totalPendingAmount.toFixed(2)}）` : ''}`;
        throw new HttpException(errorMsg, HttpStatus.BAD_REQUEST);
      }

      // 检查是否有待审核的提现申请
      const pendingWithdraws = await this.withdrawRepository.find({
        where: {
          craftsman_user_id: craftsmanUserId,
          status: WithdrawStatus.PENDING,
        },
        order: {
          createdAt: 'DESC',
        },
      });

      if (pendingWithdraws && pendingWithdraws.length > 0) {
        const totalPendingAmount = pendingWithdraws.reduce(
          (sum, w) => sum + Number(w.amount),
          0,
        );
        throw new HttpException(
          `您有待审核的提现申请（共${pendingWithdraws.length}笔，合计¥${totalPendingAmount.toFixed(2)}），请等待审核完成后再申请`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // 从余额中扣除提现金额（不冻结）
      await this.walletService.deductBalance(craftsmanUserId, amount);

      // 创建提现申请
      const withdraw = this.withdrawRepository.create({
        craftsman_user_id: craftsmanUserId,
        craftsman_bank_card_id: null as any,
        amount,
        status: WithdrawStatus.PENDING,
      });

      const savedWithdraw = await this.withdrawRepository.save(withdraw);

      // 创建账户明细：申请提现中（支出）
      try {
        await this.walletTransactionService.create({
          craftsman_user_id: craftsmanUserId,
          amount,
          type: WalletTransactionType.EXPENSE,
          description: '申请提现中',
          order_id: `withdraw_${savedWithdraw.id}`,
        });
      } catch (error) {
        console.error('创建账户明细失败:', error);
        // 不影响提现申请流程，只记录错误
      }

      return savedWithdraw;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('申请提现失败:', error);
      throw new HttpException(
        '申请提现失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 查询当前用户的提现申请列表
   * @param craftsmanUserId 工匠用户ID
   * @returns 提现申请列表
   */
  async getMyWithdraws(craftsmanUserId: number): Promise<any> {
    try {
      const withdraws = await this.withdrawRepository.find({
        where: {
          craftsman_user_id: craftsmanUserId,
        },
        relations: ['craftsman_user', 'craftsman_bank_card'],
        order: {
          createdAt: 'DESC',
        },
      });

      // 格式化返回数据，确保包含银行卡信息
      const formattedData = await Promise.all(
        withdraws.map(async (withdraw) => {
          // 优先使用提现记录中的银行卡，如果没有则查询用户的银行卡
          let bankCard: CraftsmanBankCard | null = withdraw.craftsman_bank_card;
          
          // 如果提现记录中没有银行卡，通过用户ID查询
          if (!bankCard && withdraw.craftsman_user_id) {
            try {
              bankCard = await this.bankCardRepository.findOne({
                where: { craftsman_user_id: withdraw.craftsman_user_id },
              });
            } catch (error) {
              console.error(`查询用户 ${withdraw.craftsman_user_id} 银行卡失败:`, error);
            }
          }

          return {
            id: withdraw.id,
            craftsman_user: withdraw.craftsman_user
              ? {
                  id: withdraw.craftsman_user.id,
                  nickname: withdraw.craftsman_user.nickname,
                  phone: withdraw.craftsman_user.phone,
                  avatar: withdraw.craftsman_user.avatar,
                }
              : null,
            craftsman_bank_card: bankCard
              ? {
                  id: bankCard.id,
                  bank_name: bankCard.bank_name,
                  card_number: bankCard.card_number,
                  bank_branch: bankCard.bank_branch,
                  name: bankCard.name,
                  phone: bankCard.phone,
                }
              : null,
            amount: Number(withdraw.amount),
            status: withdraw.status,
            createdAt: withdraw.createdAt,
            updatedAt: withdraw.updatedAt,
          };
        }),
      );

      return {
        success: true,
        data: formattedData,
        code: 200,
        message: null,
      };
    } catch (error) {
      console.error('查询提现申请失败:', error);
      throw new HttpException(
        '查询提现申请失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 审核提现申请
   * @param auditDto 审核信息
   * @returns 更新后的提现申请
   */
  async auditWithdraw(auditDto: AuditWithdrawDto): Promise<Withdraw> {
    try {
      const { withdraw_id, status } = auditDto;

      // 查找提现申请
      const withdraw = await this.withdrawRepository.findOne({
        where: { id: withdraw_id },
        relations: ['craftsman_user', 'craftsman_bank_card'],
      });

      if (!withdraw) {
        throw new HttpException('提现申请不存在', HttpStatus.NOT_FOUND);
      }

      // 如果当前状态不是"已申请"，不能再次审核
      if (withdraw.status !== WithdrawStatus.PENDING) {
        throw new HttpException(
          '该提现申请已处理，不能重复审核',
          HttpStatus.BAD_REQUEST,
        );
      }

      const amount = Number(withdraw.amount);
      const craftsmanUserId = withdraw.craftsman_user_id;

      // 根据审核结果处理
      if (status === WithdrawStatus.COMPLETED) {
        // 审核通过：余额已经在申请时扣除，无需额外操作
        // （申请时只扣除了 balance，没有冻结，所以审核通过时不需要操作）
        
        // 创建账户明细：提现成功（支出）
        try {
          await this.walletTransactionService.create({
            craftsman_user_id: craftsmanUserId,
            amount,
            type: WalletTransactionType.EXPENSE,
            description: '提现成功',
            order_id: `withdraw_${withdraw_id}`,
          });
        } catch (error) {
          console.error('创建账户明细失败:', error);
          // 不影响审核流程，只记录错误
        }
      } else if (status === WithdrawStatus.REJECTED) {
        // 审核拒绝：将余额退回（申请时扣除了 balance，现在需要退回）
        await this.walletService.addBalance(craftsmanUserId, amount);
        
        // 创建账户明细：拒绝提现（收入，退回）
        try {
          await this.walletTransactionService.create({
            craftsman_user_id: craftsmanUserId,
            amount,
            type: WalletTransactionType.INCOME,
            description: '拒绝提现',
            order_id: `withdraw_${withdraw_id}`,
          });
        } catch (error) {
          console.error('创建账户明细失败:', error);
          // 不影响审核流程，只记录错误
        }
      }

      // 更新状态
      withdraw.status = status;

      // 保存更新
      const updatedWithdraw = await this.withdrawRepository.save(withdraw);

      return updatedWithdraw;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('审核提现申请失败:', error);
      throw new HttpException(
        '审核提现申请失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
