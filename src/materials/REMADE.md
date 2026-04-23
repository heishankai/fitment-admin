# Materials 辅材模块 - 接口服务逻辑说明

## 1. GET `/materials/order/:orderId` - 根据订单ID查询辅材列表

**请求**: 路径参数 `orderId`（订单ID）

**响应**: `MaterialsResponseDto` - `{ commodity_list, total_price }`

**逻辑流程**:
1. 校验订单是否存在，不存在则返回 404
2. 查询该订单下所有辅材记录，按创建时间倒序
3. 将辅材记录转换为商品列表格式（含 id、commodity_id、commodity_name、commodity_price、quantity、is_paid、is_accepted 等）
4. 计算总价：所有 `settlement_amount` 之和
5. 返回 `{ commodity_list, total_price }`

---

## 2. POST `/materials` - 创建辅材

**请求**: 需要 token 鉴权，Body: `CreateMaterialsDto`（orderId + commodity_list）

**响应**: 创建的辅材记录数组 `Materials[]`

**逻辑流程**:
1. 从 token 解析 `userId`（工匠用户ID），未授权返回 401
2. 校验订单是否存在，不存在返回 404
3. 校验订单是否属于该工匠（`order.craftsman_user_id === userId`），否则返回 403
4. 校验订单状态：
   - 已完成 → 返回 400「订单已完成，无法添加辅材」
   - 已取消 → 返回 400「订单已取消，无法添加辅材」
   - 非已接单 → 返回 400「只有已接单的订单才能添加辅材」
5. 遍历 `commodity_list`，为每项创建辅材记录：
   - `settlement_amount = commodity_price * quantity`
   - `is_paid = false`，`is_accepted = false`
   - 兼容 `commodity_id` 或 `id` 字段
6. 批量保存并返回创建的辅材列表

---

## 3. POST `/materials/accept` - 验收单个辅材

**请求**: Body: `AcceptMaterialsDto`（materialsId）

**响应**: `null`（由全局拦截器包装）

**逻辑流程**:
1. 根据 `materialsId` 查找辅材及关联订单
2. 校验：辅材不存在 → 404
3. 校验：订单已取消 → 400「订单已取消，无法进行验收操作」
4. 校验：订单未接单（无 craftsman_user_id）→ 400「订单尚未接单，无法验收」
5. 校验：辅材未付款 → 400「辅材尚未付款，请联系平台付款」
6. 校验：辅材已验收 → 400「辅材已经验收过，无法重复验收」
7. 设置 `is_accepted = true` 并保存
8. 调用 `orderService.handleOrderCompletionAfterAcceptance(orderId)` 检查订单是否完成
9. 返回 null

---

## 4. PUT `/materials/:id/confirm-payment` - 确认单个辅材支付

**请求**: 路径参数 `id`（辅材ID）

**响应**: `null`

**逻辑流程**:
1. 根据辅材 ID 查找辅材及关联订单
2. 校验：辅材不存在 → 404
3. 校验：订单已取消 → 400「订单已取消，无法进行支付操作」
4. 校验：辅材已付款 → 400「辅材已经付款，无法重复支付」
5. 设置 `is_paid = true` 并保存
6. 创建平台收支记录（`PlatformIncomeRecord`，cost_type: MATERIALS）
7. 返回 null

---

## 5. POST `/materials/batch-payment` - 一键支付（按订单批量确认支付）

**请求**: Body: `BatchPaymentMaterialsDto`（orderId）

**响应**: `null`

**逻辑流程**:
1. 校验订单是否存在，不存在 → 404
2. 校验：订单已取消 → 400
3. 查询该订单下所有 `is_paid = false` 的辅材
4. 校验：无未支付辅材 → 400「该订单下没有未支付的辅材」
5. 批量将辅材 `is_paid` 设为 true 并保存
6. 为每个辅材创建平台收支记录（辅材费用）
7. 返回 null

---

## 6. POST `/materials/batch-accept` - 一键验收（按辅材ID列表）

**请求**: Body: `BatchAcceptMaterialsDto`（materialsIds: number[]）

**响应**: `null`

**逻辑流程**:
1. 根据 `materialsIds` 批量查询辅材及关联订单
2. 校验：未找到任何辅材 → 404
3. 校验：请求的 ID 中有不存在的 → 404「以下辅材ID不存在: xxx」
4. 逐条校验辅材：
   - 订单已取消 → 加入 invalidMaterials
   - 订单未接单 → 加入 invalidMaterials
   - 辅材未付款 → 加入 invalidMaterials
   - 辅材已验收 → 加入 invalidMaterials
5. 若有 invalidMaterials，返回 400 并拼接错误信息
6. 若 validMaterials 为空 → 400「没有可以验收的辅材」
7. 批量将 validMaterials 的 `is_accepted` 设为 true 并保存
8. 对受影响的订单逐个调用 `handleOrderCompletionAfterAcceptance`
9. 返回 null

---

## 7. POST `/materials/batch-accept-by-order/:orderId` - 一键验收（按订单ID）

**请求**: 路径参数 `orderId`

**响应**: `null`

**逻辑流程**:
1. 校验订单是否存在，不存在 → 404
2. 校验：订单已取消 → 400
3. 查询该订单下所有辅材
4. 校验：无辅材 → 400「该订单下没有辅材」
5. 校验：存在未支付辅材 → 400「有 N 个辅材尚未支付，无法验收。请先完成所有辅材的支付。」
6. 逐条校验辅材：
   - 订单未接单 → 加入 invalidMaterials
   - 已验收 → 跳过（不影响其他辅材）
7. 若有 invalidMaterials → 400
8. 若 validMaterials 为空 → 400「该订单的所有辅材都已验收或不需要验收」
9. 批量将 validMaterials 的 `is_accepted` 设为 true 并保存
10. 调用 `handleOrderCompletionAfterAcceptance(orderId)` 检查订单是否完成
11. 返回 null

---

## 状态流转说明

```
辅材创建 → is_paid: false, is_accepted: false
    ↓
平台确认支付 → is_paid: true（创建平台收支记录）
    ↓
工匠/平台验收 → is_accepted: true（触发订单完成检查）
```

## 前置条件汇总

| 操作       | 订单状态   | 订单接单 | 辅材付款 | 辅材验收 |
|------------|------------|----------|----------|----------|
| 创建辅材   | 已接单     | -        | -        | -        |
| 确认支付   | 非已取消   | -        | 未支付   | -        |
| 验收辅材   | 非已取消   | 已接单   | 已支付   | 未验收   |
