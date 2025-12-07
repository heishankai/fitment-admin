import { DataSource } from 'typeorm';
import { DATABASE_CONFIG } from '../src/common/constants/app.constants';
import { CraftsmanUser } from '../src/craftsman-user/craftsman-user.entity';
import { CraftsmanBankCard } from '../src/craftsman-bank-card/craftsman-bank-card.entity';
import { WechatUser } from '../src/wechat-user/wechat-user.entity';
import { Wallet } from '../src/wallet/wallet.entity';
import { Withdraw } from '../src/withdraw/withdraw.entity';
import { WalletTransaction } from '../src/wallet-transaction/wallet-transaction.entity';
import { Order, OrderStatus } from '../src/order/order.entity';

/**
 * 重置订单 29 的验收状态并清空用户钱包、提现记录和账户明细
 * 使用方法：npx ts-node scripts/reset-order-29.ts
 */
async function resetOrder29() {
  // 创建数据库连接
  const dataSource = new DataSource({
    type: DATABASE_CONFIG.type as any,
    host: DATABASE_CONFIG.host,
    port: DATABASE_CONFIG.port,
    username: DATABASE_CONFIG.username,
    password: DATABASE_CONFIG.password,
    database: DATABASE_CONFIG.database,
    entities: [
      CraftsmanUser,
      CraftsmanBankCard,
      WechatUser,
      Wallet,
      Withdraw,
      WalletTransaction,
      Order,
    ],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('数据库连接成功');

    const orderRepository = dataSource.getRepository(Order);
    const withdrawRepository = dataSource.getRepository(Withdraw);
    const walletRepository = dataSource.getRepository(Wallet);
    const walletTransactionRepository = dataSource.getRepository(WalletTransaction);

    // 1. 查找订单 29
    const order = await orderRepository.findOne({
      where: { id: 29 },
    });

    if (!order) {
      console.log('订单 29 不存在');
      await dataSource.destroy();
      return;
    }

    console.log(`找到订单 29，工匠用户ID: ${order.craftsman_user_id || '无'}`);

    if (!order.craftsman_user_id) {
      console.log('订单尚未接单，无需处理用户数据');
    } else {
      const craftsmanUserId = order.craftsman_user_id;

      // 2. 清空用户钱包
      let wallet = await walletRepository.findOne({
        where: { craftsman_user_id: craftsmanUserId },
      });

      if (wallet) {
        const oldBalance = Number(wallet.balance) || 0;
        const oldFreezeMoney = Number(wallet.freeze_money) || 0;
        console.log(`\n用户 ${craftsmanUserId} 钱包信息:`);
        console.log(`  原始余额: ¥${oldBalance.toFixed(2)}`);
        console.log(`  原始冻结金额: ¥${oldFreezeMoney.toFixed(2)}`);

        wallet.balance = 0;
        wallet.freeze_money = 0;
        await walletRepository.save(wallet);
        console.log(`  ✅ 钱包已清空`);
      } else {
        console.log(`\n用户 ${craftsmanUserId} 没有钱包记录`);
      }

      // 3. 删除用户的所有提现申请记录
      const withdraws = await withdrawRepository.find({
        where: { craftsman_user_id: craftsmanUserId },
      });

      if (withdraws.length > 0) {
        console.log(`\n找到 ${withdraws.length} 条提现申请记录:`);
        for (const withdraw of withdraws) {
          console.log(
            `  提现记录 ID: ${withdraw.id}, 金额: ¥${Number(withdraw.amount).toFixed(2)}, 状态: ${withdraw.status === 1 ? '审核中' : withdraw.status === 2 ? '已完成' : '已拒绝'}`,
          );
          await withdrawRepository.remove(withdraw);
          console.log(`  ✅ 已删除提现记录 ID: ${withdraw.id}`);
        }
      } else {
        console.log(`\n用户 ${craftsmanUserId} 没有提现申请记录`);
      }

      // 4. 删除用户的所有账户明细记录
      const transactions = await walletTransactionRepository.find({
        where: { craftsman_user_id: craftsmanUserId },
      });

      if (transactions.length > 0) {
        console.log(`\n找到 ${transactions.length} 条账户明细记录:`);
        for (const transaction of transactions) {
          const transactionId = transaction.id;
          console.log(
            `  账户明细 ID: ${transactionId}, 金额: ¥${Number(transaction.amount).toFixed(2)}, 类型: ${transaction.type === 1 ? '收入' : '支出'}, 描述: ${transaction.description || '无'}, 订单ID: ${transaction.order_id || '无'}`,
          );
          await walletTransactionRepository.remove(transaction);
          console.log(`  ✅ 已删除账户明细 ID: ${transactionId}`);
        }
      } else {
        console.log(`\n用户 ${craftsmanUserId} 没有账户明细记录`);
      }
    }

    // 5. 重置订单验收状态
    console.log('\n重置订单验收状态...');

    // 重置 work_prices 的验收状态
    if (order.work_prices && order.work_prices.length > 0) {
      console.log('处理主工价单 (work_prices)...');
      for (let i = 0; i < order.work_prices.length; i++) {
        const workPrice = order.work_prices[i];
        
        // 重置总验收状态
        if (workPrice.total_is_accepted === true) {
          workPrice.total_is_accepted = false;
          console.log(`  工价单 ${i}: total_is_accepted 已重置为 false`);
        }

        // 重置 prices_list 中各项的验收状态
        if (workPrice.prices_list && workPrice.prices_list.length > 0) {
          for (let j = 0; j < workPrice.prices_list.length; j++) {
            const priceItem = workPrice.prices_list[j];
            if (priceItem.is_accepted === true) {
              priceItem.is_accepted = false;
              console.log(
                `    工价项 ${j} (${priceItem.work_kind?.work_kind_name || '未知'}): is_accepted 已重置为 false`,
              );
            }
          }
        }
      }
    }

    // 重置 sub_work_prices 的验收状态
    if (order.sub_work_prices && order.sub_work_prices.length > 0) {
      console.log('处理子工价单 (sub_work_prices)...');
      for (let i = 0; i < order.sub_work_prices.length; i++) {
        const subWorkPrice = order.sub_work_prices[i];
        
        // 重置总验收状态
        if (subWorkPrice.total_is_accepted === true) {
          subWorkPrice.total_is_accepted = false;
          console.log(`  子工价单 ${i}: total_is_accepted 已重置为 false`);
        }
      }
    }

    // 重置 materials_list 的验收状态
    if (order.materials_list && order.materials_list.length > 0) {
      console.log('处理辅材列表 (materials_list)...');
      for (let i = 0; i < order.materials_list.length; i++) {
        const material = order.materials_list[i];
        
        // 重置总验收状态
        if (material.total_is_accepted === true) {
          material.total_is_accepted = false;
          console.log(`  辅材 ${i}: total_is_accepted 已重置为 false`);
        }
      }
    }

    // 如果订单状态是已完成，改为已接单
    if (order.order_status === OrderStatus.COMPLETED) {
      order.order_status = OrderStatus.ACCEPTED;
      order.order_status_name = '已接单';
      console.log('\n订单状态已从"已完成"改为"已接单"');
    }

    // 保存订单
    await orderRepository.save(order);
    console.log('\n✅ 订单验收状态已重置');

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
resetOrder29();
