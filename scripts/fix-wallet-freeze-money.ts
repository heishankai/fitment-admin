import { DataSource } from 'typeorm';
import { DATABASE_CONFIG } from '../src/common/constants/app.constants';
import { Wallet } from '../src/wallet/wallet.entity';
import { Withdraw } from '../src/withdraw/withdraw.entity';
import { CraftsmanUser } from '../src/craftsman-user/craftsman-user.entity';
import { CraftsmanBankCard } from '../src/craftsman-bank-card/craftsman-bank-card.entity';

/**
 * 修复用户钱包的冻结金额
 * 使用方法：ts-node scripts/fix-wallet-freeze-money.ts <craftsman_user_id>
 */
async function fixWalletFreezeMoney() {
  // 获取命令行参数（必须：指定用户ID）
  const args = process.argv.slice(2);
  const targetUserId = args[0] ? parseInt(args[0], 10) : null;

  if (!targetUserId) {
    console.error('请提供用户ID: ts-node scripts/fix-wallet-freeze-money.ts <craftsman_user_id>');
    process.exit(1);
  }

  // 创建数据库连接
  const dataSource = new DataSource({
    type: DATABASE_CONFIG.type as any,
    host: DATABASE_CONFIG.host,
    port: DATABASE_CONFIG.port,
    username: DATABASE_CONFIG.username,
    password: DATABASE_CONFIG.password,
    database: DATABASE_CONFIG.database,
    entities: [Wallet, Withdraw, CraftsmanUser, CraftsmanBankCard],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('数据库连接成功');

    const walletRepository = dataSource.getRepository(Wallet);
    const withdrawRepository = dataSource.getRepository(Withdraw);

    // 查找钱包
    let wallet = await walletRepository.findOne({
      where: { craftsman_user_id: targetUserId },
    });

    if (!wallet) {
      console.log(`用户 ${targetUserId} 没有钱包`);
      await dataSource.destroy();
      return;
    }

    console.log(`\n当前钱包信息:`);
    console.log(`  余额: ¥${Number(wallet.balance).toFixed(2)}`);
    console.log(`  冻结金额: ¥${Number(wallet.freeze_money).toFixed(2)}`);

    // 查找所有待审核（已申请）的提现记录
    const pendingWithdraws = await withdrawRepository.find({
      where: {
        craftsman_user_id: targetUserId,
        status: 1, // 已申请
      },
    });

    console.log(`\n找到 ${pendingWithdraws.length} 条待审核的提现记录:`);
    let totalPendingAmount = 0;
    for (const withdraw of pendingWithdraws) {
      const amount = Number(withdraw.amount);
      totalPendingAmount += amount;
      console.log(`  ID: ${withdraw.id}, 金额: ¥${amount.toFixed(2)}`);
    }

    // 计算正确的冻结金额
    // 冻结金额应该等于所有待审核提现的总金额
    const correctFreezeMoney = totalPendingAmount;
    const currentFreezeMoney = Number(wallet.freeze_money) || 0;

    console.log(`\n冻结金额计算:`);
    console.log(`  当前冻结金额: ¥${currentFreezeMoney.toFixed(2)}`);
    console.log(`  待审核提现总额: ¥${totalPendingAmount.toFixed(2)}`);
    console.log(`  正确冻结金额应该是: ¥${correctFreezeMoney.toFixed(2)}`);

    if (Math.abs(currentFreezeMoney - correctFreezeMoney) < 0.01) {
      console.log(`\n✅ 冻结金额正确，无需修复`);
      await dataSource.destroy();
      return;
    }

    // 修复冻结金额
    wallet.freeze_money = correctFreezeMoney;
    await walletRepository.save(wallet);

    console.log(`\n✅ 钱包冻结金额已修复:`);
    console.log(`  冻结金额: ¥${currentFreezeMoney.toFixed(2)} -> ¥${correctFreezeMoney.toFixed(2)}`);
    console.log(`  余额: ¥${Number(wallet.balance).toFixed(2)} (未变化)`);

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

// 执行修复
fixWalletFreezeMoney();
