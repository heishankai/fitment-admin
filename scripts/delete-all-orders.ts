import { DataSource } from 'typeorm';
import { DATABASE_CONFIG } from '../src/common/constants/app.constants';

/**
 * 删除订单模块中的所有数据
 * 使用方法：
 * ts-node scripts/delete-all-orders.ts
 */
async function deleteAllOrders() {
  // 创建数据库连接
  const dataSource = new DataSource({
    type: DATABASE_CONFIG.type as any,
    host: DATABASE_CONFIG.host,
    port: DATABASE_CONFIG.port,
    username: DATABASE_CONFIG.username,
    password: DATABASE_CONFIG.password,
    database: DATABASE_CONFIG.database,
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('数据库连接成功\n');

    // 按顺序删除所有引用订单的表的数据
    // 注意：必须按照外键依赖关系的顺序删除

    console.log('开始删除订单相关数据...\n');

    // 1. 先删除 craftsman_price 表的数据（如果存在，因为它引用了 gangmaster_price）
    try {
      const result0 = await dataSource.query('DELETE FROM craftsman_price');
      console.log(`✅ 已删除 craftsman_price 表的所有数据 (${result0.affectedRows} 条)`);
    } catch (error: any) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('ℹ️  craftsman_price 表不存在，跳过');
      } else {
        console.log(`⚠️  删除 craftsman_price 失败: ${error.message}`);
      }
    }

    // 2. 删除 gangmaster_price 表的数据（如果存在）
    try {
      const result1 = await dataSource.query('DELETE FROM gangmaster_price');
      console.log(`✅ 已删除 gangmaster_price 表的所有数据 (${result1.affectedRows} 条)`);
    } catch (error: any) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('ℹ️  gangmaster_price 表不存在，跳过');
      } else {
        console.log(`⚠️  删除 gangmaster_price 失败: ${error.message}`);
      }
    }

    // 3. 删除 construction_progress 表的数据（打卡记录）
    try {
      const result2 = await dataSource.query('DELETE FROM construction_progress');
      console.log(`✅ 已删除 construction_progress 表的所有数据 (${result2.affectedRows} 条)`);
    } catch (error: any) {
      console.log(`⚠️  删除 construction_progress 失败: ${error.message}`);
    }

    // 4. 删除 materials 表的数据（辅材）
    try {
      const result3 = await dataSource.query('DELETE FROM materials');
      console.log(`✅ 已删除 materials 表的所有数据 (${result3.affectedRows} 条)`);
    } catch (error: any) {
      console.log(`⚠️  删除 materials 失败: ${error.message}`);
    }

    // 5. 删除 platform_income_record 表的数据（平台收入记录）
    try {
      const result4 = await dataSource.query('DELETE FROM platform_income_record');
      console.log(`✅ 已删除 platform_income_record 表的所有数据 (${result4.affectedRows} 条)`);
    } catch (error: any) {
      console.log(`⚠️  删除 platform_income_record 失败: ${error.message}`);
    }

    // 6. 最后删除 order 表的数据（订单）
    try {
      const result5 = await dataSource.query('DELETE FROM `order`');
      console.log(`✅ 已删除 order 表的所有数据 (${result5.affectedRows} 条)`);
    } catch (error: any) {
      console.log(`⚠️  删除 order 失败: ${error.message}`);
    }

    // 关闭数据库连接
    await dataSource.destroy();
    console.log('\n数据库连接已关闭');
    console.log('✅ 所有订单相关数据删除完成！');
  } catch (error) {
    console.error('操作失败:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

// 执行删除
deleteAllOrders();
