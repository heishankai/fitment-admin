import { DataSource } from 'typeorm';
import { DATABASE_CONFIG } from '../src/common/constants/app.constants';
import { Order } from '../src/order/order.entity';
import { WechatUser } from '../src/wechat-user/wechat-user.entity';
import { CraftsmanUser } from '../src/craftsman-user/craftsman-user.entity';
import { Wallet } from '../src/wallet/wallet.entity';

/**
 * 重置订单验收状态并清空钱包脚本
 * 使用方法：ts-node scripts/reset-order-acceptance-and-wallet.ts
 */
async function resetOrderAcceptanceAndWallet() {
  // 创建数据库连接
  const dataSource = new DataSource({
    type: DATABASE_CONFIG.type as any,
    host: DATABASE_CONFIG.host,
    port: DATABASE_CONFIG.port,
    username: DATABASE_CONFIG.username,
    password: DATABASE_CONFIG.password,
    database: DATABASE_CONFIG.database,
    entities: [Order, WechatUser, CraftsmanUser, Wallet],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('数据库连接成功');

    const orderRepository = dataSource.getRepository(Order);
    const walletRepository = dataSource.getRepository(Wallet);

    // 查找订单ID为27的订单
    const order = await orderRepository.findOne({
      where: { id: 27 },
    });

    if (!order) {
      console.log('订单ID 27 不存在');
      return;
    }

    console.log(`找到订单 ${order.id}`);

    // 1. 重置验收状态
    console.log('开始重置验收状态...');

    // 处理 work_prices
    if (order.work_prices && Array.isArray(order.work_prices)) {
      order.work_prices = order.work_prices.map((workPrice: any) => {
        // 重置 total_is_accepted
        workPrice.total_is_accepted = false;

        // 重置所有 prices_list 中的 is_accepted
        if (workPrice.prices_list && Array.isArray(workPrice.prices_list)) {
          workPrice.prices_list = workPrice.prices_list.map((item: any) => {
            if (item.is_accepted !== undefined) {
              item.is_accepted = false;
            }
            return item;
          });
        }

        console.log(`  重置 work_prices[0] 验收状态`);
        return workPrice;
      });
    }

    // 处理 sub_work_prices
    if (order.sub_work_prices && Array.isArray(order.sub_work_prices)) {
      order.sub_work_prices = order.sub_work_prices.map((workPrice: any) => {
        // 重置 total_is_accepted
        workPrice.total_is_accepted = false;
        console.log(`  重置 sub_work_prices 验收状态`);
        return workPrice;
      });
    }

    // 保存订单
    await orderRepository.save(order);
    console.log('✅ 订单验收状态已重置');

    // 2. 清空钱包
    if (order.craftsman_user_id) {
      console.log(`开始清空工匠 ${order.craftsman_user_id} 的钱包...`);

      const wallet = await walletRepository.findOne({
        where: { craftsman_user_id: order.craftsman_user_id },
      });

      if (wallet) {
        const oldBalance = wallet.balance;
        const oldFreezeMoney = wallet.freeze_money;

        wallet.balance = 0;
        wallet.freeze_money = 0;

        await walletRepository.save(wallet);

        console.log(`  原始余额: ${oldBalance}`);
        console.log(`  原始冻结金额: ${oldFreezeMoney}`);
        console.log('✅ 钱包已清空');
      } else {
        console.log('⚠️  钱包不存在，无需清空');
      }
    } else {
      console.log('⚠️  订单没有关联的工匠，无需清空钱包');
    }

    // 关闭数据库连接
    await dataSource.destroy();
    console.log('数据库连接已关闭');
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
resetOrderAcceptanceAndWallet();
