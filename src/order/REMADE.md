# 我需要一个增加订单工费的功能 现在是在 order 中 prices_list 中，有没有跟好的设计方案：

1. 需要分为 根据 craftsman_user_work_kind_name 分为两种角色，一种是 工长，一种是其他工匠
2. 如果 craftsman_user_work_kind_name 是工长时，需要判断 prices_list中，是否有"水电"或"泥瓦工"，有的话就给这一项添加 is_accepted 验收字段，并且根据 total_price 和 area 来用公式计算工长的工费和上门次数，最后再按照工费+施工费用的10%来收取平台服务费，工长工费字段+到 total_price 中。
3. 如果 craftsman_user_work_kind_name 不是工长，则直接计算 total_price 和平台服务费
4. 每一笔订单都有一个总验收状态字段
5. 这是总订单的逻辑，并且每一笔订单都可以基于这个订单创建一个子订单，子订单只收取平台服务费，没有工费，子订单的钱不会累加到总订单的 total_price 中

work_prices:{
visiting_service_num: number // 上门服务费数量
total_is_accepted: boolean // 总验收状态
total_price: number // 施工费用
area:number | string // 平米数
total_service_fee: number // 平台服务费
craftsman_user_work_kind_name: string // 当前用户的工种名称
prices_list [{
"id": 36, // 工价id
"quantity": 1, // 数量
"work_kind": {
"id": 7, // 工种id
"work_kind_name": "油漆" // 工种名称
},
"work_price": "222", // 工价
"work_title": "油漆-1212121", // 工价标题
 "labour_cost": {
"id": 2, // 单位id
"labour_cost_name": "平方米" // 单位名称
},
"work_kind_id": 7, // 工种id
"minimum_price": "300", // 最低价格
"labour_cost_id": 2, // 单位id
"is_set_minimum_price": "1" // 是否设置最低价格
}]}

/\*\*

- 工长费用 & 上门次数 计算公式（不满足60平按照60平算，不设置上限，按照这个规则一直往上加）
- @param {number} area - 面积（㎡）
- @param {number} cost - 施工费用（元）
- @returns {{ foremanFee: number, visits: number }}
  \*/
  function calcForeman(area, cost) {
  // 1. 面积段基础信息配置
  const areaConfigs = [
  { min: 60, max: 70, baseFee: 8000, baseVisit: 24, step: 18000 },
  { min: 70, max: 80, baseFee: 8400, baseVisit: 26, step: 20000 },
  { min: 80, max: 90, baseFee: 8800, baseVisit: 28, step: 22000 },
  { min: 90, max: 100, baseFee: 9200, baseVisit: 30, step: 24000 },
  ];

// 2. 找到对应面积的配置
const cfg = areaConfigs.find((item) => area >= item.min && area < item.max);
if (!cfg) {
throw new Error("面积不在可计算范围内（60-100㎡）");
}

// 3. 计算施工费用档位（每档跨度与表格一致）
// 第一档：0 - step
// 第二档：step - 1.35*step
// 第三档：1.35*step - 1.7*step
// 第四档：以上
// ——表格中每档宽度均为 step * 0.35
const step1 = cfg.step;
const step2 = step1 _ 1.35;
const step3 = step1 _ 1.70;

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

// 4. 工长费用 = 基础工长费 + 档位 _ 1000
const foremanFee = cfg.baseFee + level _ 1000;

// 5. 上门次数 = 基础上门次数 + 档位 _ 3
const visits = cfg.baseVisit + level _ 3;

return { foremanFee, visits };
}
