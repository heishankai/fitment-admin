import { DataSource } from 'typeorm';
import { DATABASE_CONFIG } from '../src/common/constants/app.constants';
import { Order } from '../src/order/order.entity';
import { Wallet } from '../src/wallet/wallet.entity';
import { WalletTransaction } from '../src/wallet-transaction/wallet-transaction.entity';
import { Withdraw } from '../src/withdraw/withdraw.entity';
import { ConstructionProgress } from '../src/construction-progress/construction-progress.entity';
import { Materials } from '../src/materials/materials.entity';
import { PlatformIncomeRecord } from '../src/platform-income-record/platform-income-record.entity';
import { CraftsmanUser } from '../src/craftsman-user/craftsman-user.entity';
import { WechatUser } from '../src/wechat-user/wechat-user.entity';
import { CraftsmanBankCard } from '../src/craftsman-bank-card/craftsman-bank-card.entity';

/**
 * 清空指定手机号的所有相关数据
 * 使用方法：
 * ts-node scripts/clear-user-data.ts
 */
async function clearUserData() {
  // 工匠用户手机号列表
  const craftsmanPhones = ['17681540570', '17681878550', '18667177723'];
  
  // 微信用户手机号列表
  const wechatPhones = ['18667177723'];

  // 创建数据库连接
  const dataSource = new DataSource({
    type: DATABASE_CONFIG.type as any,
    host: DATABASE_CONFIG.host,
    port: DATABASE_CONFIG.port,
    username: DATABASE_CONFIG.username,
    password: DATABASE_CONFIG.password,
    database: DATABASE_CONFIG.database,
    entities: [
      Order,
      Wallet,
      WalletTransaction,
      Withdraw,
      ConstructionProgress,
      Materials,
      PlatformIncomeRecord,
      CraftsmanUser,
      WechatUser,
      CraftsmanBankCard,
    ],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('数据库连接成功\n');

    const orderRepository = dataSource.getRepository(Order);
    const walletRepository = dataSource.getRepository(Wallet);
    const walletTransactionRepository = dataSource.getRepository(WalletTransaction);
    const withdrawRepository = dataSource.getRepository(Withdraw);
    const constructionProgressRepository = dataSource.getRepository(ConstructionProgress);
    const materialsRepository = dataSource.getRepository(Materials);
    const platformIncomeRecordRepository = dataSource.getRepository(PlatformIncomeRecord);
    const craftsmanUserRepository = dataSource.getRepository(CraftsmanUser);
    const wechatUserRepository = dataSource.getRepository(WechatUser);

    // ========== 处理工匠用户数据 ==========
    console.log('========== 开始处理工匠用户数据 ==========\n');
    
    for (const phone of craftsmanPhones) {
      console.log(`\n处理工匠用户手机号: ${phone}`);
      
      // 查找工匠用户
      const craftsmanUser = await craftsmanUserRepository.findOne({
        where: { phone },
      });

      if (!craftsmanUser) {
        console.log(`  ⚠️  未找到手机号为 ${phone} 的工匠用户，跳过`);
        continue;
      }

      const craftsmanUserId = craftsmanUser.id;
      console.log(`  ✅ 找到工匠用户 ID: ${craftsmanUserId}`);

      // 1. 查找该工匠用户的所有订单
      const orders = await orderRepository.find({
        where: { craftsman_user_id: craftsmanUserId },
      });
      const orderIds = orders.map((o) => o.id);
      console.log(`  📦 找到 ${orders.length} 个订单`);

      // 2. 删除关联的打卡记录
      if (orderIds.length > 0) {
        const result1 = await dataSource.query(
          `DELETE FROM construction_progress WHERE orderId IN (${orderIds.map(() => '?').join(',')})`,
          orderIds,
        );
        const deletedCount1 = result1.affectedRows || 0;
        if (deletedCount1 > 0) {
          console.log(`  ✅ 已删除 ${deletedCount1} 条打卡记录`);
        }
      }

      // 3. 删除关联的辅材记录
      if (orderIds.length > 0) {
        const result2 = await dataSource.query(
          `DELETE FROM materials WHERE orderId IN (${orderIds.map(() => '?').join(',')})`,
          orderIds,
        );
        const deletedCount2 = result2.affectedRows || 0;
        if (deletedCount2 > 0) {
          console.log(`  ✅ 已删除 ${deletedCount2} 条辅材记录`);
        }
      }

      // 4. 删除关联的平台收入记录
      if (orderIds.length > 0) {
        const result3 = await dataSource.query(
          `DELETE FROM platform_income_record WHERE orderId IN (${orderIds.map(() => '?').join(',')})`,
          orderIds,
        );
        const deletedCount3 = result3.affectedRows || 0;
        if (deletedCount3 > 0) {
          console.log(`  ✅ 已删除 ${deletedCount3} 条平台收入记录`);
        }
      }

      // 5. 删除订单
      if (orders.length > 0) {
        await orderRepository.remove(orders);
        console.log(`  ✅ 已删除 ${orders.length} 个订单`);
      }

      // 6. 删除钱包交易记录
      const walletTransactions = await walletTransactionRepository.find({
        where: { craftsman_user_id: craftsmanUserId },
      });
      if (walletTransactions.length > 0) {
        await walletTransactionRepository.remove(walletTransactions);
        console.log(`  ✅ 已删除 ${walletTransactions.length} 条钱包交易记录`);
      }

      // 7. 删除提现记录
      const withdraws = await withdrawRepository.find({
        where: { craftsman_user_id: craftsmanUserId },
      });
      if (withdraws.length > 0) {
        await withdrawRepository.remove(withdraws);
        console.log(`  ✅ 已删除 ${withdraws.length} 条提现记录`);
      }

      // 8. 重置钱包余额和冻结金额
      const wallet = await walletRepository.findOne({
        where: { craftsman_user_id: craftsmanUserId },
      });
      if (wallet) {
        wallet.balance = 0;
        wallet.freeze_money = 0;
        await walletRepository.save(wallet);
        console.log(`  ✅ 已重置钱包余额和冻结金额为 0`);
      } else {
        console.log(`  ℹ️  该用户没有钱包记录`);
      }

      console.log(`  ✅ 工匠用户 ${phone} 的数据清理完成`);
    }

    // ========== 处理微信用户数据 ==========
    console.log('\n\n========== 开始处理微信用户数据 ==========\n');
    
    for (const phone of wechatPhones) {
      console.log(`\n处理微信用户手机号: ${phone}`);
      
      // 查找微信用户
      const wechatUser = await wechatUserRepository.findOne({
        where: { phone },
      });

      if (!wechatUser) {
        console.log(`  ⚠️  未找到手机号为 ${phone} 的微信用户，跳过`);
        continue;
      }

      const wechatUserId = wechatUser.id;
      console.log(`  ✅ 找到微信用户 ID: ${wechatUserId}`);

      // 1. 查找该微信用户的所有订单
      const orders = await orderRepository.find({
        where: { wechat_user_id: wechatUserId },
      });
      const orderIds = orders.map((o) => o.id);
      console.log(`  📦 找到 ${orders.length} 个订单`);

      // 2. 删除关联的打卡记录
      if (orderIds.length > 0) {
        const result1 = await dataSource.query(
          `DELETE FROM construction_progress WHERE orderId IN (${orderIds.map(() => '?').join(',')})`,
          orderIds,
        );
        const deletedCount1 = result1.affectedRows || 0;
        if (deletedCount1 > 0) {
          console.log(`  ✅ 已删除 ${deletedCount1} 条打卡记录`);
        }
      }

      // 3. 删除关联的辅材记录
      if (orderIds.length > 0) {
        const result2 = await dataSource.query(
          `DELETE FROM materials WHERE orderId IN (${orderIds.map(() => '?').join(',')})`,
          orderIds,
        );
        const deletedCount2 = result2.affectedRows || 0;
        if (deletedCount2 > 0) {
          console.log(`  ✅ 已删除 ${deletedCount2} 条辅材记录`);
        }
      }

      // 4. 删除关联的平台收入记录
      if (orderIds.length > 0) {
        const result3 = await dataSource.query(
          `DELETE FROM platform_income_record WHERE orderId IN (${orderIds.map(() => '?').join(',')})`,
          orderIds,
        );
        const deletedCount3 = result3.affectedRows || 0;
        if (deletedCount3 > 0) {
          console.log(`  ✅ 已删除 ${deletedCount3} 条平台收入记录`);
        }
      }

      // 5. 删除订单
      if (orders.length > 0) {
        await orderRepository.remove(orders);
        console.log(`  ✅ 已删除 ${orders.length} 个订单`);
      }

      console.log(`  ✅ 微信用户 ${phone} 的数据清理完成`);
    }

    // 关闭数据库连接
    await dataSource.destroy();
    console.log('\n\n数据库连接已关闭');
    console.log('✅ 所有操作完成！');
  } catch (error) {
    console.error('操作失败:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

// 执行清理
clearUserData();
