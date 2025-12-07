import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './wallet.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {}

  /**
   * 获取或创建钱包
   * @param craftsmanUserId 工匠用户ID
   * @returns 钱包信息
   */
  async getOrCreateWallet(craftsmanUserId: number): Promise<Wallet> {
    let wallet = await this.walletRepository.findOne({
      where: { craftsman_user_id: craftsmanUserId },
    });

    if (!wallet) {
      wallet = this.walletRepository.create({
        craftsman_user_id: craftsmanUserId,
        balance: 0,
        freeze_money: 0,
      });
      wallet = await this.walletRepository.save(wallet);
    }

    return wallet;
  }

  /**
   * 增加余额
   * @param craftsmanUserId 工匠用户ID
   * @param amount 金额
   * @returns 更新后的钱包
   */
  async addBalance(
    craftsmanUserId: number,
    amount: number,
  ): Promise<Wallet> {
    const wallet = await this.getOrCreateWallet(craftsmanUserId);
    wallet.balance = Number(wallet.balance) + amount;
    return await this.walletRepository.save(wallet);
  }

  /**
   * 增加冻结金额
   * @param craftsmanUserId 工匠用户ID
   * @param amount 金额
   * @returns 更新后的钱包
   */
  async addFreezeMoney(
    craftsmanUserId: number,
    amount: number,
  ): Promise<Wallet> {
    const wallet = await this.getOrCreateWallet(craftsmanUserId);
    wallet.freeze_money = Number(wallet.freeze_money) + amount;
    return await this.walletRepository.save(wallet);
  }

  /**
   * 增加余额和冻结金额
   * @param craftsmanUserId 工匠用户ID
   * @param balanceAmount 余额增加金额
   * @param freezeAmount 冻结金额增加金额
   * @returns 更新后的钱包
   */
  async addBalanceAndFreeze(
    craftsmanUserId: number,
    balanceAmount: number,
    freezeAmount: number,
  ): Promise<Wallet> {
    const wallet = await this.getOrCreateWallet(craftsmanUserId);
    wallet.balance = Number(wallet.balance) + balanceAmount;
    wallet.freeze_money = Number(wallet.freeze_money) + freezeAmount;
    return await this.walletRepository.save(wallet);
  }

  /**
   * 获取钱包信息
   * @param craftsmanUserId 工匠用户ID
   * @returns 钱包信息
   */
  async getWallet(craftsmanUserId: number): Promise<Wallet> {
    return await this.getOrCreateWallet(craftsmanUserId);
  }

  /**
   * 减少冻结金额
   * @param craftsmanUserId 工匠用户ID
   * @param amount 金额
   * @returns 更新后的钱包
   */
  async reduceFreezeMoney(
    craftsmanUserId: number,
    amount: number,
  ): Promise<Wallet> {
    const wallet = await this.getOrCreateWallet(craftsmanUserId);
    const currentFreezeMoney = Number(wallet.freeze_money);
    if (currentFreezeMoney < amount) {
      throw new HttpException(
        '冻结金额不足',
        HttpStatus.BAD_REQUEST,
      );
    }
    wallet.freeze_money = currentFreezeMoney - amount;
    return await this.walletRepository.save(wallet);
  }

  /**
   * 减少冻结金额并增加余额（退回）
   * @param craftsmanUserId 工匠用户ID
   * @param amount 金额
   * @returns 更新后的钱包
   */
  async unfreezeMoney(
    craftsmanUserId: number,
    amount: number,
  ): Promise<Wallet> {
    const wallet = await this.getOrCreateWallet(craftsmanUserId);
    const currentFreezeMoney = Number(wallet.freeze_money);
    if (currentFreezeMoney < amount) {
      throw new HttpException(
        '冻结金额不足',
        HttpStatus.BAD_REQUEST,
      );
    }
    wallet.freeze_money = currentFreezeMoney - amount;
    wallet.balance = Number(wallet.balance) + amount;
    return await this.walletRepository.save(wallet);
  }

  /**
   * 从余额中扣除并冻结金额（申请提现时使用）
   * @param craftsmanUserId 工匠用户ID
   * @param amount 金额
   * @returns 更新后的钱包
   */
  async deductBalanceAndFreeze(
    craftsmanUserId: number,
    amount: number,
  ): Promise<Wallet> {
    const wallet = await this.getOrCreateWallet(craftsmanUserId);
    const currentBalance = Number(wallet.balance);
    if (currentBalance < amount) {
      throw new HttpException(
        '余额不足',
        HttpStatus.BAD_REQUEST,
      );
    }
    wallet.balance = currentBalance - amount;
    wallet.freeze_money = Number(wallet.freeze_money) + amount;
    return await this.walletRepository.save(wallet);
  }

  /**
   * 从余额中扣除金额（申请提现时使用，不冻结）
   * @param craftsmanUserId 工匠用户ID
   * @param amount 金额
   * @returns 更新后的钱包
   */
  async deductBalance(
    craftsmanUserId: number,
    amount: number,
  ): Promise<Wallet> {
    const wallet = await this.getOrCreateWallet(craftsmanUserId);
    const currentBalance = Number(wallet.balance);
    if (currentBalance < amount) {
      throw new HttpException(
        '余额不足',
        HttpStatus.BAD_REQUEST,
      );
    }
    wallet.balance = currentBalance - amount;
    return await this.walletRepository.save(wallet);
  }
}
