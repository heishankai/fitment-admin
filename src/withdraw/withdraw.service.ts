import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Withdraw, WithdrawStatus } from './withdraw.entity';
import { QueryWithdrawDto } from './dto/query-withdraw.dto';
import { AuditWithdrawDto } from './dto/audit-withdraw.dto';
import { CreateWithdrawDto } from './dto/create-withdraw.dto';
import { WalletService } from '../wallet/wallet.service';
import { CraftsmanBankCard } from '../craftsman-bank-card/craftsman-bank-card.entity';
import { WalletTransactionService } from '../wallet-transaction/wallet-transaction.service';
import { WalletTransactionType } from '../wallet-transaction/wallet-transaction.entity';
import * as ExcelJS from 'exceljs';

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
   * 构建查询构建器（复用查询逻辑）
   * @param queryDto 查询参数
   * @returns 查询构建器
   */
  private buildQueryBuilder(
    queryDto: QueryWithdrawDto,
  ): SelectQueryBuilder<Withdraw> {
    const {
      craftsman_user_name = '',
      phone = '',
      status,
      apply_time = [],
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

    // 添加筛选条件：工匠手机号
    if (phone) {
      query.andWhere('craftsman_user.phone LIKE :phone', {
        phone: `%${phone}%`,
      });
    }

    // 添加筛选条件：状态
    if (status !== undefined && status !== null) {
      query.andWhere('withdraw.status = :status', { status });
    }

    // 申请时间范围筛选
    if (apply_time && Array.isArray(apply_time) && apply_time.length === 2) {
      const [startDate, endDate] = apply_time;

      // 验证日期格式
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      if (startDate) {
        if (!dateRegex.test(startDate)) {
          throw new BadRequestException(
            '开始日期格式错误，请使用 YYYY-MM-DD 格式',
          );
        }
        const start = new Date(startDate + ' 00:00:00');
        query.andWhere('withdraw.createdAt >= :startDate', {
          startDate: start,
        });
      }

      if (endDate) {
        if (!dateRegex.test(endDate)) {
          throw new BadRequestException(
            '结束日期格式错误，请使用 YYYY-MM-DD 格式',
          );
        }
        const end = new Date(endDate + ' 23:59:59');
        query.andWhere('withdraw.createdAt <= :endDate', { endDate: end });
      }
    }

    // 按创建时间倒序排列
    query.orderBy('withdraw.createdAt', 'DESC');

    return query;
  }

  /**
   * 格式化提现数据
   * @param withdraws 提现记录数组
   * @returns 格式化后的数据
   */
  private async formatWithdrawData(withdraws: Withdraw[]): Promise<any[]> {
    return await Promise.all(
      withdraws.map(async (withdraw) => {
        // 优先使用提现记录中的银行卡，如果没有则查询用户的银行卡
        let bankCard: CraftsmanBankCard | null = withdraw.craftsman_bank_card;

        // 如果提现记录中没有银行卡，通过用户ID查询
        const userId =
          withdraw.craftsman_user_id || withdraw.craftsman_user?.id;
        if (!bankCard && userId) {
          try {
            bankCard = await this.bankCardRepository.findOne({
              where: { craftsman_user_id: userId },
            });
          } catch (error) {
            console.error(`[提现导出] 查询用户 ${userId} 银行卡失败:`, error);
          }
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
  }

  /**
   * 分页查询提现申请列表
   * @param queryDto 查询参数
   * @returns 分页结果
   */
  async getWithdrawsByPage(queryDto: QueryWithdrawDto): Promise<any> {
    try {
      const { pageIndex = 1, pageSize = 10 } = queryDto;

      // 构建查询
      const query = this.buildQueryBuilder(queryDto);

      // 查询总数
      const total = await query.getCount();

      // 查询数据（分页）
      const data = await query
        .skip((pageIndex - 1) * pageSize)
        .take(pageSize)
        .getMany();

      // 格式化返回数据
      const formattedData = await this.formatWithdrawData(data);

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
      throw new HttpException('申请提现失败', HttpStatus.INTERNAL_SERVER_ERROR);
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
              console.error(
                `查询用户 ${withdraw.craftsman_user_id} 银行卡失败:`,
                error,
              );
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
            description: '提现失败（请联系客服）',
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

  /**
   * 导出提现申请列表为 Excel
   * @param queryDto 查询参数（可选，不传则导出全部）
   * @returns Excel 文件流
   */
  async exportWithdrawsToExcel(
    queryDto?: Partial<QueryWithdrawDto>,
  ): Promise<ExcelJS.Buffer> {
    try {
      // 构建查询（如果提供了查询条件则使用，否则查询全部）
      const query = this.buildQueryBuilder(queryDto || {});

      // 查询所有符合条件的数据（不分页）
      const withdraws = await query.getMany();

      // 格式化数据
      const formattedData = await this.formatWithdrawData(withdraws);

      // 创建 Excel 工作簿
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('提现申请列表');

      // 设置列标题
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: '工匠昵称', key: 'nickname', width: 20 },
        { header: '手机号', key: 'phone', width: 15 },
        { header: '提现金额', key: 'amount', width: 15 },
        { header: '状态', key: 'statusText', width: 12 },
        { header: '银行名称', key: 'bankName', width: 20 },
        { header: '银行卡号', key: 'cardNumber', width: 25 },
        { header: '开户行', key: 'bankBranch', width: 25 },
        { header: '持卡人姓名', key: 'cardName', width: 15 },
        { header: '持卡人手机', key: 'cardPhone', width: 15 },
        { header: '申请时间', key: 'createdAt', width: 20 },
        { header: '更新时间', key: 'updatedAt', width: 20 },
      ];

      // 设置表头样式
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      worksheet.getRow(1).alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      // 状态映射
      const statusMap: Record<number, string> = {
        1: '审核中',
        2: '已完成',
        3: '已拒绝',
      };

      // 添加数据行
      formattedData.forEach((item) => {
        const row = worksheet.addRow({
          id: item.id,
          nickname: item.nickname,
          phone: item.phone,
          amount: `¥${item.amount.toFixed(2)}`,
          statusText: statusMap[item.status] || '未知',
          bankName: item.craftsman_bank_card?.bank_name || '',
          cardNumber: item.craftsman_bank_card?.card_number || '',
          bankBranch: item.craftsman_bank_card?.bank_branch || '',
          cardName: item.craftsman_bank_card?.name || '',
          cardPhone: item.craftsman_bank_card?.phone || '',
          createdAt: item.createdAt
            ? new Date(item.createdAt).toLocaleString('zh-CN')
            : '',
          updatedAt: item.updatedAt
            ? new Date(item.updatedAt).toLocaleString('zh-CN')
            : '',
        });

        // 设置行样式
        row.alignment = { vertical: 'middle', horizontal: 'left' };
      });

      // 设置列宽自适应
      worksheet.columns.forEach((column) => {
        if (column.header) {
          column.width = Math.max(column.width || 10, column.header.length + 2);
        }
      });

      // 生成 Excel 文件缓冲区
      const buffer = await workbook.xlsx.writeBuffer();

      return buffer as ExcelJS.Buffer;
    } catch (error) {
      console.error('导出提现申请列表失败:', error);
      if (
        error instanceof HttpException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new HttpException(
        '导出提现申请列表失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
