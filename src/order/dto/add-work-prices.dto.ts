import {
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * 工价项
 */
export class WorkPriceItem {
  @IsNotEmpty({ message: '总价不能为空' })
  @IsNumber()
  @Min(0, { message: '总价不能小于0' })
  total_price: number; // 施工费用

  @IsNotEmpty({ message: '价格列表不能为空' })
  @IsArray({ message: '价格列表必须是数组' })
  prices_list: Array<{
    id: number; // 工价id
    quantity: number; // 数量
    work_kind: {
      id: number; // 工种id
      work_kind_name: string; // 工种名称
      [key: string]: any; // 允许其他字段（如 key, label, title, value, createdAt, updatedAt）
    };
    work_price: string; // 工价
    work_title: string; // 工价标题
    labour_cost: {
      id: number; // 单位id
      labour_cost_name: string; // 单位名称
      [key: string]: any; // 允许其他字段（如 key, label, title, value, createdAt, updatedAt）
    };
    work_kind_id: number; // 工种id
    minimum_price: string; // 最低价格
    is_set_minimum_price: string; // 是否设置最低价格
  }>;

  @IsNotEmpty({ message: '平米数不能为空' })
  @Transform(({ value }) => {
    // 支持字符串和数字两种类型
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num; // 如果转换失败，返回0
    }
    if (typeof value === 'number') {
      return value;
    }
    return 0; // 其他类型返回0
  })
  @IsNumber({}, { message: '平米数必须是数字' })
  @Min(0, { message: '平米数不能小于0' })
  area: number | string; // 平米数（支持字符串和数字）

  @IsNotEmpty({ message: '工匠工种名称不能为空' })
  @IsString()
  craftsman_user_work_kind_name: string; // 当前用户的工种名称

  @IsOptional()
  @IsNumber()
  total_service_fee?: number; // 平台服务费（可选，由后端计算）

  @IsOptional()
  @IsNumber()
  visiting_service_num?: number; // 上门服务费数量（可选，由后端计算）

  @IsOptional()
  @IsBoolean()
  is_paid?: boolean; // 用户是否已付款（可选，默认为false）
}

/**
 * 添加工价DTO
 */
export class AddWorkPricesDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsNumber()
  orderId: number;

  @IsNotEmpty({ message: '工价信息不能为空' })
  @IsArray({ message: '工价信息必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => WorkPriceItem)
  work_prices: WorkPriceItem[];
}

