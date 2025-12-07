import { DataSource } from 'typeorm';
import { DATABASE_CONFIG } from '../src/common/constants/app.constants';
import { Order } from '../src/order/order.entity';
import { WechatUser } from '../src/wechat-user/wechat-user.entity';
import { CraftsmanUser } from '../src/craftsman-user/craftsman-user.entity';

/**
 * 刷新订单服务费脚本
 * 根据当前逻辑重新计算 total_service_fee
 * 使用方法：ts-node scripts/refresh-order-service-fee.ts
 */
async function refreshOrderServiceFee() {
  // 创建数据库连接
  const dataSource = new DataSource({
    type: DATABASE_CONFIG.type as any,
    host: DATABASE_CONFIG.host,
    port: DATABASE_CONFIG.port,
    username: DATABASE_CONFIG.username,
    password: DATABASE_CONFIG.password,
    database: DATABASE_CONFIG.database,
    entities: [Order, WechatUser, CraftsmanUser],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('数据库连接成功');

    const orderRepository = dataSource.getRepository(Order);

    // 查找订单ID为27的订单
    const order = await orderRepository.findOne({
      where: { id: 27 },
    });

    if (!order) {
      console.log('订单ID 27 不存在');
      return;
    }

    console.log(`找到订单 ${order.id}，开始刷新服务费...`);

    let hasChanges = false;

    // 处理 work_prices
    if (order.work_prices && Array.isArray(order.work_prices)) {
      order.work_prices = order.work_prices.map((workPrice: any) => {
        const isForeman = workPrice.craftsman_user_work_kind_name === '工长';
        const totalPrice = workPrice.total_price || 0;
        const gangmasterCost = workPrice.gangmaster_cost || 0;
        const currentServiceFee = workPrice.total_service_fee || 0;

        let totalServiceFee = 0;

        if (isForeman) {
          // 判断 prices_list 中是否有"水电"或"泥瓦工"
          const hasShuiDianOrNiWa =
            workPrice.prices_list?.some(
              (item: any) =>
                item.work_kind?.work_kind_name === '水电' ||
                item.work_kind?.work_kind_name === '泥瓦工',
            ) || false;

          // 工长：平台服务费只按照施工费用的10%来收取，不包含工长费用
          totalServiceFee = totalPrice * 0.1;
          if (hasShuiDianOrNiWa && gangmasterCost > 0) {
            console.log(`  工长工价项（有水电/泥瓦工）:`);
            console.log(`    施工费用: ${totalPrice}`);
            console.log(`    工长费用: ${gangmasterCost}（不参与服务费计算）`);
            console.log(`    平台服务费: ${totalServiceFee}`);
          } else {
            console.log(`  工长工价项（无水电/泥瓦工）:`);
            console.log(`    施工费用: ${totalPrice}`);
            console.log(`    平台服务费: ${totalServiceFee}`);
          }
        } else {
          // 其他工匠逻辑：按照施工费用的10%来收取平台服务费
          totalServiceFee = totalPrice * 0.1;
          console.log(`  其他工匠工价项:`);
          console.log(`    施工费用: ${totalPrice}`);
          console.log(`    平台服务费: ${totalServiceFee}`);
        }

        // 检查是否有变化（使用更严格的比较，避免浮点数精度问题）
        const feeDiff = Math.abs(totalServiceFee - currentServiceFee);
        if (feeDiff > 0.001) {
          hasChanges = true;
          console.log(`    原始服务费: ${currentServiceFee} -> 新服务费: ${totalServiceFee} (差异: ${feeDiff.toFixed(4)})`);
        } else {
          console.log(`    服务费已正确: ${totalServiceFee}`);
        }

        return {
          ...workPrice,
          total_service_fee: Math.round(totalServiceFee * 100) / 100, // 保留两位小数
        };
      });
    }

    // 子工价不需要更新服务费，保持原样
    if (order.sub_work_prices && Array.isArray(order.sub_work_prices)) {
      console.log(`  子工价项: 跳过更新（保持原值）`);
    }

    // 即使没有变化，也保存一次以确保数据格式一致（特别是浮点数精度）
    if (hasChanges || order.work_prices || order.sub_work_prices) {
      // 保存更新后的订单
      await orderRepository.save(order);
      if (hasChanges) {
        console.log('✅ 订单服务费刷新成功！');
      } else {
        console.log('✅ 订单服务费已更新（确保数据格式一致）！');
      }
    } else {
      console.log('ℹ️  订单服务费无需更新');
    }

    // 关闭数据库连接
    await dataSource.destroy();
    console.log('数据库连接已关闭');
  } catch (error) {
    console.error('刷新失败:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

// 执行刷新
refreshOrderServiceFee();
