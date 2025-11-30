import {
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  IsString,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 商品项
 */
export class CommodityItem {
  @IsNotEmpty({ message: '商品ID不能为空' })
  @IsNumber()
  id: number;

  @IsNotEmpty({ message: '商品名称不能为空' })
  @IsString()
  commodity_name: string;

  @IsNotEmpty({ message: '商品价格不能为空' })
  @IsString()
  commodity_price: string;

  @IsNotEmpty({ message: '商品单位不能为空' })
  @IsString()
  commodity_unit: string;

  @IsNotEmpty({ message: '商品数量不能为空' })
  @IsNumber()
  @Min(1, { message: '商品数量必须大于0' })
  quantity: number;

  @IsOptional()
  @IsArray({ message: '商品封面必须是数组' })
  @IsString({ each: true, message: '封面URL必须是字符串' })
  commodity_cover?: string[];
}

/**
 * 辅材项
 */
export class MaterialsItem {
  @IsNotEmpty({ message: '总价不能为空' })
  @IsNumber()
  @Min(0, { message: '总价不能小于0' })
  total_price: number;

  @IsNotEmpty({ message: '商品列表不能为空' })
  @IsArray({ message: '商品列表必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => CommodityItem)
  commodity_list: CommodityItem[];
}

/**
 * 添加辅材DTO
 */
export class AddMaterialsDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsNumber()
  orderId: number;

  @IsNotEmpty({ message: '辅材信息不能为空' })
  @IsArray({ message: '辅材信息必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => MaterialsItem)
  materials: MaterialsItem[];
}

