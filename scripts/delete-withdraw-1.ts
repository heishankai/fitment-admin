import { DataSource } from 'typeorm';
import { DATABASE_CONFIG } from '../src/common/constants/app.constants';
import { Withdraw } from '../src/withdraw/withdraw.entity';
import { Wallet } from '../src/wallet/wallet.entity';
import { CraftsmanUser } from '../src/craftsman-user/craftsman-user.entity';
import { CraftsmanBankCard } from '../src/craftsman-bank-card/craftsman-bank-card.entity';

/**
 * 删除提现记录 ID=1 并恢复钱包金额
 * 使用方法：ts-node scripts/delete-withdraw-1.ts
 */
async function deleteWithdraw1() {
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

    // 查找提现记录 ID=1
    const withdraw = await withdrawRepository.findOne({
      where: { id: 1 },
    });

    if (!withdraw) {
      console.log('提现记录 ID=1 不存在');
      await dataSource.destroy();
      return;
    }

    console.log(`找到提现记录:`);
    console.log(`  ID: ${withdraw.id}`);
    console.log(`  用户ID: ${withdraw.craftsman_user_id}`);
    console.log(`  金额: ¥${Number(withdraw.amount).toFixed(2)}`);
    console.log(`  状态: ${withdraw.status === 1 ? '已申请' : withdraw.status === 2 ? '已完成' : '已拒绝'}`);

    const userId = withdraw.craftsman_user_id;
    const amount = Number(withdraw.amount);
    const status = withdraw.status;

    // 获取钱包
    let wallet = await walletRepository.findOne({
      where: { craftsman_user_id: userId },
    });

    if (!wallet) {
      console.log(`用户 ${userId} 没有钱包，创建新钱包...`);
      wallet = walletRepository.create({
        craftsman_user_id: userId,
        balance: 0,
        freeze_money: 0,
      });
      wallet = await walletRepository.save(wallet);
    }

    const oldBalance = Number(wallet.balance) || 0;
    const oldFreezeMoney = Number(wallet.freeze_money) || 0;

    console.log(`\n钱包信息:`);
    console.log(`  原始余额: ¥${oldBalance.toFixed(2)}`);
    console.log(`  原始冻结金额: ¥${oldFreezeMoney.toFixed(2)}`);

    // 根据状态恢复钱包金额
    if (status === 1) {
      // 已申请：冻结金额退回余额
      wallet.freeze_money = Math.max(0, oldFreezeMoney - amount);
      wallet.balance = oldBalance + amount;
      console.log(`\n处理逻辑: 已申请状态，冻结金额退回余额`);
      console.log(`  冻结金额: ¥${oldFreezeMoney.toFixed(2)} -> ¥${wallet.freeze_money.toFixed(2)}`);
      console.log(`  余额: ¥${oldBalance.toFixed(2)} -> ¥${wallet.balance.toFixed(2)}`);
    } else if (status === 2) {
      // 已完成：退回余额（因为审核通过时已经扣除了）
      wallet.balance = oldBalance + amount;
      console.log(`\n处理逻辑: 已完成状态，退回余额`);
      console.log(`  余额: ¥${oldBalance.toFixed(2)} -> ¥${wallet.balance.toFixed(2)}`);
    } else if (status === 3) {
      // 已拒绝：已经退回过了，只需要删除记录
      console.log(`\n处理逻辑: 已拒绝状态，已退回，无需操作钱包`);
    }

    // 更新钱包
    await walletRepository.save(wallet);
    console.log('✅ 钱包金额已恢复');

    // 删除提现记录
    await withdrawRepository.remove(withdraw);
    console.log('✅ 提现记录已删除');

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

// 执行删除
deleteWithdraw1();
