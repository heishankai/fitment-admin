import {
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsString,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 商品项
 */
export class CommodityItem {
  @IsNotEmpty({ message: '商品ID不能为空' })
  @IsNumber()
  commodity_id: number; // 商品ID

  @IsOptional()
  @IsNumber()
  id?: number; // 兼容字段，可选

  @IsNotEmpty({ message: '商品名称不能为空' })
  @IsString()
  commodity_name: string; // 商品名称

  @IsNotEmpty({ message: '商品价格不能为空' })
  @IsString()
  commodity_price: string; // 商品价格（字符串格式）

  @IsNotEmpty({ message: '商品单位不能为空' })
  @IsString()
  commodity_unit: string; // 商品单位

  @IsNotEmpty({ message: '数量不能为空' })
  @IsNumber()
  @Min(0, { message: '数量不能小于0' })
  quantity: number; // 数量

  @IsOptional()
  @IsArray()
  commodity_cover?: string[]; // 商品封面
}

/**
 * 创建辅材DTO
 */
export class CreateMaterialsDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsNumber()
  orderId: number; // 订单ID

  @IsNotEmpty({ message: '商品列表不能为空' })
  @IsArray({ message: '商品列表必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => CommodityItem)
  commodity_list: CommodityItem[]; // 商品列表
}
