import { DataSource } from 'typeorm';
import { DATABASE_CONFIG } from '../src/common/constants/app.constants';
import { Order } from '../src/order/order.entity';
import { WechatUser } from '../src/wechat-user/wechat-user.entity';
import { CraftsmanUser } from '../src/craftsman-user/craftsman-user.entity';

/**
 * 工长费用 & 上门次数 计算公式
 * 规则：
 * 1. 不足60平按照60平计算
 * 2. 60-200平按照对应面积段配置
 * 3. 超出200平按照规则递增（每10平，基础费用+400，基础上门次数+2，step+2000）
 * @param area - 面积（㎡）
 * @param cost - 施工费用（元）
 * @returns {{ foremanFee: number, visits: number }}
 */
function calcForeman(area: number, cost: number): {
  foremanFee: number;
  visits: number;
} {
  // 规则1：不足60平按照60平计算
  const actualArea = Math.max(area, 60);

  // 1. 面积段基础信息配置（根据图片表格完整配置）
  const areaConfigs = [
    { min: 60, max: 70, baseFee: 8000, baseVisit: 24, step: 18000 },
    { min: 70, max: 80, baseFee: 8400, baseVisit: 26, step: 20000 },
    { min: 80, max: 90, baseFee: 8800, baseVisit: 28, step: 22000 },
    { min: 90, max: 100, baseFee: 9200, baseVisit: 30, step: 24000 },
    { min: 100, max: 110, baseFee: 9600, baseVisit: 32, step: 26000 },
    { min: 110, max: 120, baseFee: 10000, baseVisit: 34, step: 28000 },
    { min: 120, max: 130, baseFee: 10400, baseVisit: 36, step: 30000 },
    { min: 130, max: 140, baseFee: 10800, baseVisit: 38, step: 32000 },
    { min: 140, max: 150, baseFee: 11200, baseVisit: 40, step: 34000 },
    { min: 150, max: 160, baseFee: 11600, baseVisit: 42, step: 36000 },
    { min: 160, max: 170, baseFee: 12000, baseVisit: 44, step: 38000 },
    { min: 170, max: 180, baseFee: 12400, baseVisit: 46, step: 40000 },
    { min: 180, max: 190, baseFee: 12800, baseVisit: 48, step: 42000 },
    { min: 190, max: 200, baseFee: 13200, baseVisit: 50, step: 44000 },
  ];

  // 2. 找到对应面积的配置（60-200平）
  let cfg = areaConfigs.find(
    (item) => actualArea >= item.min && actualArea < item.max,
  );
  
  // 3. 规则3：如果超过200平，使用200平的配置，并按照规则递增计算超出部分
  // 每增加10平：基础费用+400，基础上门次数+2，step+2000
  if (!cfg) {
    const baseConfig = areaConfigs[areaConfigs.length - 1]; // 190-200的配置（作为200平的基准）
    const extraArea = actualArea - 200; // 超出200平的部分
    const extraUnits = Math.floor(extraArea / 10); // 超出多少个10平单位
    cfg = {
      ...baseConfig,
      baseFee: baseConfig.baseFee + extraUnits * 400,
      baseVisit: baseConfig.baseVisit + extraUnits * 2,
      step: baseConfig.step + extraUnits * 2000,
    };
  }

  // 3. 计算施工费用档位（每档跨度与表格一致）
  //   第一档：0 - step
  //   第二档：step - 1.35*step
  //   第三档：1.35*step - 1.7*step
  //   第四档：以上
  const step1 = cfg.step;
  const step2 = step1 * 1.35;
  const step3 = step1 * 1.7;

  let level = 0; // 第几档（0~3）
  if (cost <= step1) {
    level = 0;
  } else if (cost <= step2) {
    level = 1;
  } else if (cost <= step3) {
    level = 2;
  } else {
    level = 3; // 最高档
  }

  // 4. 工长费用 = 基础工长费 + 档位 * 1000
  const foremanFee = cfg.baseFee + level * 1000;

  // 5. 上门次数 = 基础上门次数 + 档位 * 3
  const visits = cfg.baseVisit + level * 3;

  return { foremanFee, visits };
}

/**
 * 刷新订单工价数据脚本
 * 将工长费用从 total_price 中分离出来，存储到 gangmaster_cost
 * 使用方法：ts-node scripts/refresh-order-work-prices.ts
 */
async function refreshOrderWorkPrices() {
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

    console.log(`找到订单 ${order.id}，开始刷新工价数据...`);

    let hasChanges = false;

    // 处理 work_prices
    if (order.work_prices && Array.isArray(order.work_prices)) {
      order.work_prices = order.work_prices.map((workPrice: any) => {
        const isForeman = workPrice.craftsman_user_work_kind_name === '工长';
        const area = Number(workPrice.area) || 0;
        const currentTotalPrice = workPrice.total_price || 0;
        const currentGangmasterCost = workPrice.gangmaster_cost;

        // 如果当前 total_price 包含了工长费用，需要分离出来
        // 如果已经有 gangmaster_cost，说明已经分离过了，需要重新计算
        let constructionCost = currentTotalPrice;
        let foremanFee = 0;
        let visitingServiceNum = 0;
        let totalServiceFee = 0;

        if (isForeman) {
          // 判断 prices_list 中是否有"水电"或"泥瓦工"
          const hasShuiDianOrNiWa =
            workPrice.prices_list?.some(
              (item: any) =>
                item.work_kind?.work_kind_name === '水电' ||
                item.work_kind?.work_kind_name === '泥瓦工',
            ) || false;

          if (hasShuiDianOrNiWa) {
            // 如果已经有 gangmaster_cost，说明之前已经分离过
            // 使用当前的 total_price 作为施工费用，gangmaster_cost 作为工长费用
            if (currentGangmasterCost !== undefined && currentGangmasterCost > 0) {
              constructionCost = currentTotalPrice; // total_price 应该已经是施工费用了
              foremanFee = currentGangmasterCost;
              
              // 重新计算上门次数（基于施工费用）
              const foremanResult = calcForeman(area, constructionCost);
              visitingServiceNum = foremanResult.visits;
            } else {
              // 如果 total_price 包含了工长费用，需要分离
              // 方法：先假设 total_price 是施工费用+工长费用，迭代计算
              // 1. 先用 total_price 作为施工费用估算工长费用
              let estimatedForemanFee = calcForeman(area, currentTotalPrice).foremanFee;
              
              // 2. 从 total_price 中减去估算的工长费用，得到施工费用
              constructionCost = Math.max(0, currentTotalPrice - estimatedForemanFee);
              
              // 3. 用施工费用重新计算工长费用（更准确）
              const foremanResult = calcForeman(area, constructionCost);
              foremanFee = foremanResult.foremanFee;
              visitingServiceNum = foremanResult.visits;
              
              // 4. 如果计算出的施工费用+工长费用与原始 total_price 差距较大，可能需要调整
              const calculatedTotal = constructionCost + foremanFee;
              if (Math.abs(calculatedTotal - currentTotalPrice) > 100) {
                console.log(`    ⚠️  警告: 计算出的总价(${calculatedTotal})与原始总价(${currentTotalPrice})差距较大`);
                console.log(`    使用原始 total_price 作为施工费用，重新计算工长费用`);
                // 如果差距太大，使用原始 total_price 作为施工费用重新计算
                const recalcResult = calcForeman(area, currentTotalPrice);
                constructionCost = currentTotalPrice;
                foremanFee = recalcResult.foremanFee;
                visitingServiceNum = recalcResult.visits;
              }
            }

            // 重新计算平台服务费 = (工长费用 + 施工费用) * 10%
            totalServiceFee = (foremanFee + constructionCost) * 0.1;
            
            console.log(`  工长工价项:`);
            console.log(`    原始 total_price: ${currentTotalPrice}`);
            console.log(`    施工费用: ${constructionCost}`);
            console.log(`    工长费用: ${foremanFee}`);
            console.log(`    上门次数: ${visitingServiceNum}`);
            console.log(`    平台服务费: ${totalServiceFee}`);
          } else {
            // 如果没有"水电"或"泥瓦工"，按照普通工匠逻辑处理
            constructionCost = currentTotalPrice;
            totalServiceFee = constructionCost * 0.1;
            // 清除可能存在的 gangmaster_cost
            if (currentGangmasterCost !== undefined) {
              console.log(`  工长工价项（无水电/泥瓦工，清除工长费用）:`);
            } else {
              console.log(`  工长工价项（无水电/泥瓦工）:`);
            }
            console.log(`    施工费用: ${constructionCost}`);
            console.log(`    平台服务费: ${totalServiceFee}`);
          }
        } else {
          // 其他工匠逻辑
          constructionCost = currentTotalPrice;
          totalServiceFee = constructionCost * 0.1;
          console.log(`  其他工匠工价项:`);
          console.log(`    施工费用: ${constructionCost}`);
          console.log(`    平台服务费: ${totalServiceFee}`);
        }

        // 更新数据
        const updatedWorkPrice: any = {
          ...workPrice,
          total_price: constructionCost, // 施工费用（不包含工长费用）
          total_service_fee: totalServiceFee,
        };

        // 如果是工长且有工长费用，设置 gangmaster_cost
        if (isForeman && foremanFee > 0) {
          updatedWorkPrice.gangmaster_cost = foremanFee;
          updatedWorkPrice.visiting_service_num = visitingServiceNum;
        } else {
          // 如果不是工长或没有工长费用，删除 gangmaster_cost（如果存在）
          if (updatedWorkPrice.gangmaster_cost !== undefined) {
            delete updatedWorkPrice.gangmaster_cost;
          }
        }

        // 检查是否有变化
        if (
          updatedWorkPrice.total_price !== workPrice.total_price ||
          updatedWorkPrice.total_service_fee !== workPrice.total_service_fee ||
          updatedWorkPrice.gangmaster_cost !== workPrice.gangmaster_cost ||
          updatedWorkPrice.visiting_service_num !== workPrice.visiting_service_num
        ) {
          hasChanges = true;
        }

        return updatedWorkPrice;
      });
    }

    if (hasChanges) {
      // 保存更新后的订单
      await orderRepository.save(order);
      console.log('✅ 订单工价数据刷新成功！');
    } else {
      console.log('ℹ️  订单工价数据无需更新');
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
refreshOrderWorkPrices();
