import {
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  IsString,
  IsOptional,
  IsIn,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * 工价项数据
 */
export class WorkPriceItemDto {
  @IsNotEmpty({ message: '工价ID不能为空' })
  @IsNumber()
  work_price_id: number;

  @IsNotEmpty({ message: '工价不能为空' })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0, { message: '工价不能小于0' })
  work_price: number;

  @IsNotEmpty({ message: '工价标题不能为空' })
  @IsString()
  work_title: string;

  @IsNotEmpty({ message: '数量不能为空' })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0, { message: '数量不能小于0' })
  quantity: number;

  @IsNotEmpty({ message: '工种名称不能为空' })
  @IsString()
  work_kind_name: string;

  @IsNotEmpty({ message: '工种ID不能为空' })
  @IsNumber()
  work_kind_id: number;

  @IsNotEmpty({ message: '单位名称不能为空' })
  @IsString()
  labour_cost_name: string;

  @IsOptional()
  @Transform(({ value }) => (value === null ? null : String(value)))
  minimum_price?: string | null;

  @IsNotEmpty({ message: '是否设置最低价格不能为空' })
  @IsString()
  @IsIn(['0', '1'], { message: '是否设置最低价格必须是0或1' })
  is_set_minimum_price: string;
}

/**
 * 创建工价项DTO（前端格式）
 */
export class CreateWorkPriceItemsDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsNumber()
  order_id: number;

  @IsNotEmpty({ message: '面积不能为空' })
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(0, { message: '面积不能小于0' })
  area: number | string;

  @IsNotEmpty({ message: '总价不能为空' })
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(0, { message: '总价不能小于0' })
  total_price: number;

  @IsNotEmpty({ message: '工价列表不能为空' })
  @IsArray({ message: '工价列表必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => WorkPriceItemDto)
  work_price_list: WorkPriceItemDto[];
}

