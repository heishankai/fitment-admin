import { DataSource } from 'typeorm';
import { DATABASE_CONFIG } from '../src/common/constants/app.constants';
import { Order } from '../src/order/order.entity';
import { WechatUser } from '../src/wechat-user/wechat-user.entity';
import { CraftsmanUser } from '../src/craftsman-user/craftsman-user.entity';

/**
 * 迁移脚本：将订单中的 wireman_is_accepted 和 mason_is_accepted 字段改为 is_accepted
 * 使用方法：ts-node scripts/migrate-order-acceptance-fields.ts
 */
async function migrateOrderAcceptanceFields() {
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

    console.log(`找到订单 ${order.id}，开始迁移...`);

    let hasChanges = false;

    // 处理 work_prices
    if (order.work_prices && Array.isArray(order.work_prices)) {
      order.work_prices = order.work_prices.map((workPrice) => {
        if (workPrice.prices_list && Array.isArray(workPrice.prices_list)) {
          workPrice.prices_list = workPrice.prices_list.map((priceItem: any) => {
            const updatedItem: any = { ...priceItem };

            // 如果存在 wireman_is_accepted 或 mason_is_accepted，迁移到 is_accepted
            if (updatedItem.wireman_is_accepted !== undefined) {
              updatedItem.is_accepted = updatedItem.wireman_is_accepted;
              delete updatedItem.wireman_is_accepted;
              hasChanges = true;
              console.log(`  迁移 wireman_is_accepted -> is_accepted: ${updatedItem.is_accepted}`);
            }

            if (updatedItem.mason_is_accepted !== undefined) {
              // 如果已经有 is_accepted，优先使用已有的值，否则使用 mason_is_accepted
              if (updatedItem.is_accepted === undefined) {
                updatedItem.is_accepted = updatedItem.mason_is_accepted;
              }
              delete updatedItem.mason_is_accepted;
              hasChanges = true;
              console.log(`  迁移 mason_is_accepted -> is_accepted: ${updatedItem.is_accepted}`);
            }

            return updatedItem;
          });
        }
        return workPrice;
      });
    }

    // 处理 sub_work_prices（虽然子工价单不应该有验收字段，但为了完整性也处理一下）
    if (order.sub_work_prices && Array.isArray(order.sub_work_prices)) {
      order.sub_work_prices = order.sub_work_prices.map((workPrice) => {
        if (workPrice.prices_list && Array.isArray(workPrice.prices_list)) {
          workPrice.prices_list = workPrice.prices_list.map((priceItem: any) => {
            const updatedItem: any = { ...priceItem };

            if (updatedItem.wireman_is_accepted !== undefined) {
              updatedItem.is_accepted = updatedItem.wireman_is_accepted;
              delete updatedItem.wireman_is_accepted;
              hasChanges = true;
            }

            if (updatedItem.mason_is_accepted !== undefined) {
              if (updatedItem.is_accepted === undefined) {
                updatedItem.is_accepted = updatedItem.mason_is_accepted;
              }
              delete updatedItem.mason_is_accepted;
              hasChanges = true;
            }

            return updatedItem;
          });
        }
        return workPrice;
      });
    }

    if (hasChanges) {
      // 保存更新后的订单
      await orderRepository.save(order);
      console.log('✅ 订单迁移成功！');
    } else {
      console.log('ℹ️  订单中没有需要迁移的字段');
    }

    // 关闭数据库连接
    await dataSource.destroy();
    console.log('数据库连接已关闭');
  } catch (error) {
    console.error('迁移失败:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

// 执行迁移
migrateOrderAcceptanceFields();

