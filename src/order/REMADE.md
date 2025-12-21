
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
