import { DataSource } from 'typeorm';
import { DATABASE_CONFIG } from '../src/common/constants/app.constants';
import { Wallet } from '../src/wallet/wallet.entity';
import { CraftsmanUser } from '../src/craftsman-user/craftsman-user.entity';
import { CraftsmanBankCard } from '../src/craftsman-bank-card/craftsman-bank-card.entity';

/**
 * 设置用户钱包的余额和冻结金额
 * 使用方法：ts-node scripts/set-wallet-amount.ts <craftsman_user_id> <balance> <freeze_money>
 */
async function setWalletAmount() {
  // 获取命令行参数
  const args = process.argv.slice(2);
  const targetUserId = args[0] ? parseInt(args[0], 10) : null;
  const balance = args[1] ? parseFloat(args[1]) : null;
  const freezeMoney = args[2] ? parseFloat(args[2]) : null;

  if (!targetUserId || balance === null || freezeMoney === null) {
    console.error('使用方法: ts-node scripts/set-wallet-amount.ts <craftsman_user_id> <balance> <freeze_money>');
    console.error('示例: ts-node scripts/set-wallet-amount.ts 2 500 600');
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
    entities: [Wallet, CraftsmanUser, CraftsmanBankCard],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('数据库连接成功');

    const walletRepository = dataSource.getRepository(Wallet);

    // 查找钱包
    let wallet = await walletRepository.findOne({
      where: { craftsman_user_id: targetUserId },
    });

    if (!wallet) {
      console.log(`用户 ${targetUserId} 没有钱包，创建新钱包...`);
      wallet = walletRepository.create({
        craftsman_user_id: targetUserId,
        balance: 0,
        freeze_money: 0,
      });
      wallet = await walletRepository.save(wallet);
    }

    const oldBalance = Number(wallet.balance) || 0;
    const oldFreezeMoney = Number(wallet.freeze_money) || 0;

    console.log(`\n当前钱包信息:`);
    console.log(`  余额: ¥${oldBalance.toFixed(2)}`);
    console.log(`  冻结金额: ¥${oldFreezeMoney.toFixed(2)}`);

    console.log(`\n设置钱包信息:`);
    console.log(`  余额: ¥${balance.toFixed(2)}`);
    console.log(`  冻结金额: ¥${freezeMoney.toFixed(2)}`);

    // 设置钱包金额
    wallet.balance = balance;
    wallet.freeze_money = freezeMoney;
    await walletRepository.save(wallet);

    console.log(`\n✅ 钱包金额已设置:`);
    console.log(`  余额: ¥${oldBalance.toFixed(2)} -> ¥${balance.toFixed(2)}`);
    console.log(`  冻结金额: ¥${oldFreezeMoney.toFixed(2)} -> ¥${freezeMoney.toFixed(2)}`);

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

// 执行设置
setWalletAmount();
