import {
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 商品项
 */
export class CommodityItem {
  @IsNotEmpty({ message: '商品ID不能为空' })
  @IsNumber()
  id: number; // 商品ID

  @IsNotEmpty({ message: '商品名称不能为空' })
  commodity_name: string; // 商品名称

  @IsNotEmpty({ message: '商品价格不能为空' })
  commodity_price: string; // 商品价格

  @IsNotEmpty({ message: '商品单位不能为空' })
  commodity_unit: string; // 商品单位

  @IsNotEmpty({ message: '数量不能为空' })
  @IsNumber()
  @Min(0, { message: '数量不能小于0' })
  quantity: number; // 数量

  commodity_cover?: string[]; // 商品封面
}

/**
 * 创建辅材DTO
 */
export class CreateMaterialsDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsNumber()
  orderId: number; // 订单ID

  @IsNotEmpty({ message: '总价不能为空' })
  @IsNumber()
  @Min(0, { message: '总价不能小于0' })
  total_price: number; // 总价

  @IsNotEmpty({ message: '商品列表不能为空' })
  @IsArray({ message: '商品列表必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => CommodityItem)
  commodity_list: CommodityItem[]; // 商品列表
}
