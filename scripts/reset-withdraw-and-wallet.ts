import { DataSource } from 'typeorm';
import { DATABASE_CONFIG } from '../src/common/constants/app.constants';
import { Withdraw } from '../src/withdraw/withdraw.entity';
import { Wallet } from '../src/wallet/wallet.entity';
import { CraftsmanUser } from '../src/craftsman-user/craftsman-user.entity';
import { CraftsmanBankCard } from '../src/craftsman-bank-card/craftsman-bank-card.entity';

/**
 * 删除提现记录并恢复钱包金额脚本
 * 使用方法：
 * 1. 删除所有提现记录：ts-node scripts/reset-withdraw-and-wallet.ts
 * 2. 删除指定用户的提现记录：ts-node scripts/reset-withdraw-and-wallet.ts <craftsman_user_id>
 */
async function resetWithdrawAndWallet() {
  // 获取命令行参数（可选：指定用户ID）
  const args = process.argv.slice(2);
  const targetUserId = args[0] ? parseInt(args[0], 10) : null;

  // 创建数据库连接
  const dataSource = new DataSource({
    type: DATABASE_CONFIG.type as any,
    host: DATABASE_CONFIG.host,
    port: DATABASE_CONFIG.port,
    username: DATABASE_CONFIG.username,
    password: DATABASE_CONFIG.password,
    database: DATABASE_CONFIG.database,
    entities: [Withdraw, Wallet, CraftsmanUser, CraftsmanBankCard],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('数据库连接成功');

    const withdrawRepository = dataSource.getRepository(Withdraw);
    const walletRepository = dataSource.getRepository(Wallet);

    // 查询提现记录
    const query: any = {};
    if (targetUserId) {
      query.craftsman_user_id = targetUserId;
      console.log(`查找用户 ${targetUserId} 的提现记录...`);
    } else {
      console.log('查找所有提现记录...');
    }

    const withdraws = await withdrawRepository.find({
      where: query,
      order: {
        createdAt: 'DESC',
      },
    });

    if (withdraws.length === 0) {
      console.log('没有找到提现记录');
      await dataSource.destroy();
      return;
    }

    console.log(`找到 ${withdraws.length} 条提现记录`);

    // 按用户分组处理
    const userWithdrawMap = new Map<number, typeof withdraws>();
    for (const withdraw of withdraws) {
      const userId = withdraw.craftsman_user_id;
      if (!userWithdrawMap.has(userId)) {
        userWithdrawMap.set(userId, []);
      }
      userWithdrawMap.get(userId)!.push(withdraw);
    }

    console.log(`涉及 ${userWithdrawMap.size} 个用户`);

    // 处理每个用户的提现记录和钱包
    for (const [userId, userWithdraws] of userWithdrawMap) {
      console.log(`\n处理用户 ${userId} 的提现记录...`);

      // 获取钱包
      let wallet = await walletRepository.findOne({
        where: { craftsman_user_id: userId },
      });

      if (!wallet) {
        console.log(`  用户 ${userId} 没有钱包，创建新钱包...`);
        wallet = walletRepository.create({
          craftsman_user_id: userId,
          balance: 0,
          freeze_money: 0,
        });
        wallet = await walletRepository.save(wallet);
      }

      const oldBalance = Number(wallet.balance) || 0;
      const oldFreezeMoney = Number(wallet.freeze_money) || 0;

      console.log(`  原始余额: ¥${oldBalance.toFixed(2)}`);
      console.log(`  原始冻结金额: ¥${oldFreezeMoney.toFixed(2)}`);

      // 计算需要恢复的金额
      let totalPendingAmount = 0; // 待审核（已申请）的金额
      let totalCompletedAmount = 0; // 已完成的金额
      let totalRejectedAmount = 0; // 已拒绝的金额

      for (const withdraw of userWithdraws) {
        const amount = Number(withdraw.amount);
        const status = withdraw.status;

        console.log(
          `    提现记录 ID: ${withdraw.id}, 金额: ¥${amount.toFixed(2)}, 状态: ${status === 1 ? '已申请' : status === 2 ? '已完成' : '已拒绝'}`,
        );

        if (status === 1) {
          // 已申请：需要退回余额（申请时扣除了 balance）
          totalPendingAmount += amount;
        } else if (status === 2) {
          // 已完成：不需要退回（审核通过时余额已扣除，无需操作）
          totalCompletedAmount += amount;
        } else if (status === 3) {
          // 已拒绝：已经退回过了（审核拒绝时已退回），只需要删除记录
          totalRejectedAmount += amount;
        }
      }

      // 恢复钱包金额
      let newBalance = oldBalance;
      let newFreezeMoney = oldFreezeMoney;

      // 处理待审核的提现：退回余额（申请时扣除了 balance）
      if (totalPendingAmount > 0) {
        newBalance = newBalance + totalPendingAmount;
        console.log(
          `  待审核提现（¥${totalPendingAmount.toFixed(2)}）：退回余额`,
        );
      }

      // 处理已完成的提现：不需要退回（审核通过时余额已扣除）
      if (totalCompletedAmount > 0) {
        console.log(
          `  已完成提现（¥${totalCompletedAmount.toFixed(2)}）：已扣除，无需退回`,
        );
      }

      // 处理已拒绝的提现：已经退回过了，不需要操作
      if (totalRejectedAmount > 0) {
        console.log(
          `  已拒绝提现（¥${totalRejectedAmount.toFixed(2)}）：已退回，无需操作`,
        );
      }

      // 更新钱包
      wallet.balance = newBalance;
      wallet.freeze_money = newFreezeMoney;
      await walletRepository.save(wallet);

      console.log(`  新余额: ¥${newBalance.toFixed(2)}`);
      console.log(`  新冻结金额: ¥${newFreezeMoney.toFixed(2)}`);

      // 删除提现记录
      for (const withdraw of userWithdraws) {
        await withdrawRepository.remove(withdraw);
        console.log(`  ✅ 已删除提现记录 ID: ${withdraw.id}`);
      }
    }

    // 关闭数据库连接
    await dataSource.destroy();
    console.log('\n数据库连接已关闭');
    console.log('✅ 操作完成！');
  } catch (error) {
    console.error('操作失败:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

// 执行重置
resetWithdrawAndWallet();
