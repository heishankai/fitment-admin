import { Materials } from '../materials.entity';

/**
 * 商品项响应DTO
 */
export class CommodityItemResponse {
  id: number; // 辅材记录ID
  commodity_id: number; // 商品ID
  commodity_name: string; // 商品名称
  commodity_price: number; // 商品价格
  commodity_unit: string; // 商品单位
  quantity: number; // 数量
  commodity_cover: string[]; // 商品封面
  settlement_amount: number; // 结算金额
  work_kind_name?: string; // 所属工种名称
  work_kind_code?: string; // 所属工种编码
  craftsman_user_id?: number; // 添加辅材的工匠ID
  is_paid: boolean; // 是否已付款
  is_accepted: boolean; // 是否已验收
  createdAt: Date; // 创建时间
  updatedAt: Date; // 更新时间
}

/**
 * 辅材查询响应DTO
 */
export class MaterialsResponseDto {
  commodity_list: CommodityItemResponse[]; // 商品列表
  total_price: number; // 总价（所有 settlement_amount 之和）
}
