import { DataSource } from 'typeorm';
import { DATABASE_CONFIG } from '../src/common/constants/app.constants';
import { CraftsmanBankCard } from '../src/craftsman-bank-card/craftsman-bank-card.entity';
import { CraftsmanUser } from '../src/craftsman-user/craftsman-user.entity';

/**
 * 检查用户的银行卡信息
 * 使用方法：ts-node scripts/check-bank-card.ts <craftsman_user_id>
 */
async function checkBankCard() {
  // 获取命令行参数
  const args = process.argv.slice(2);
  const targetUserId = args[0] ? parseInt(args[0], 10) : null;

  if (!targetUserId) {
    console.error('请提供用户ID: ts-node scripts/check-bank-card.ts <craftsman_user_id>');
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
    entities: [CraftsmanBankCard, CraftsmanUser],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('数据库连接成功');

    const bankCardRepository = dataSource.getRepository(CraftsmanBankCard);
    const userRepository = dataSource.getRepository(CraftsmanUser);

    // 检查用户是否存在
    const user = await userRepository.findOne({
      where: { id: targetUserId },
    });

    if (!user) {
      console.log(`用户 ID ${targetUserId} 不存在`);
      await dataSource.destroy();
      return;
    }

    console.log(`\n用户信息:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  昵称: ${user.nickname}`);
    console.log(`  手机: ${user.phone}`);

    // 查询银行卡
    const bankCard = await bankCardRepository.findOne({
      where: { craftsman_user_id: targetUserId },
    });

    if (bankCard) {
      console.log(`\n✅ 找到银行卡信息:`);
      console.log(`  ID: ${bankCard.id}`);
      console.log(`  银行名称: ${bankCard.bank_name}`);
      console.log(`  卡号: ${bankCard.card_number}`);
      console.log(`  开户行: ${bankCard.bank_branch || '-'}`);
      console.log(`  持卡人: ${bankCard.name}`);
      console.log(`  手机: ${bankCard.phone}`);
    } else {
      console.log(`\n❌ 用户 ID ${targetUserId} 没有银行卡信息`);
    }

    // 关闭数据库连接
    await dataSource.destroy();
    console.log('\n数据库连接已关闭');
  } catch (error) {
    console.error('操作失败:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

// 执行检查
checkBankCard();
