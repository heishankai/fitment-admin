import { DataSource } from 'typeorm';
import { DATABASE_CONFIG } from '../src/common/constants/app.constants';
import { Order } from '../src/order/order.entity';
import { WechatUser } from '../src/wechat-user/wechat-user.entity';
import { CraftsmanUser } from '../src/craftsman-user/craftsman-user.entity';
import { Wallet } from '../src/wallet/wallet.entity';

async function checkOrder27() {
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

    const order = await orderRepository.findOne({
      where: { id: 27 },
    });

    if (!order) {
      console.log('订单不存在');
      return;
    }

    console.log('订单信息:');
    console.log(`  订单ID: ${order.id}`);
    console.log(`  工匠ID: ${order.craftsman_user_id}`);

    if (order.work_prices && order.work_prices.length > 0) {
      const workPrice = order.work_prices[0];
      console.log(`\n工价信息:`);
      console.log(`  gangmaster_cost: ${workPrice.gangmaster_cost}`);
      console.log(`  total_is_accepted: ${workPrice.total_is_accepted}`);
      console.log(`  prices_list 长度: ${workPrice.prices_list?.length || 0}`);

      if (workPrice.prices_list) {
        workPrice.prices_list.forEach((item: any, index: number) => {
          const workKindName = item.work_kind?.work_kind_name || '';
          const isAccepted = item.is_accepted || false;
          const needsAcceptance = workKindName === '水电' || workKindName === '泥瓦工';
          
          console.log(`\n  prices_list[${index}]:`);
          console.log(`    工种: ${workKindName}`);
          console.log(`    需要验收: ${needsAcceptance}`);
          console.log(`    已验收: ${isAccepted}`);
        });
      }

      // 计算应该验收的项
      const acceptedItems = workPrice.prices_list?.filter(
        (item: any) =>
          (item.work_kind?.work_kind_name === '水电' ||
            item.work_kind?.work_kind_name === '泥瓦工') &&
          item.is_accepted === true,
      ) || [];

      console.log(`\n已验收的单项数量: ${acceptedItems.length}`);
      console.log(`应该打款的金额: ${acceptedItems.length * (workPrice.gangmaster_cost || 0) * 0.25}`);
    }

    if (order.craftsman_user_id) {
      const wallet = await walletRepository.findOne({
        where: { craftsman_user_id: order.craftsman_user_id },
      });

      if (wallet) {
        console.log(`\n钱包信息:`);
        console.log(`  balance: ${wallet.balance}`);
        console.log(`  freeze_money: ${wallet.freeze_money}`);
      }
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('检查失败:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

checkOrder27();
