import {
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  IsString,
  IsOptional,
  IsIn,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  return Number(value);
};

const toOptionalString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
};

/**
 * 工价项数据
 */
export class WorkPriceItemDto {
  @IsNotEmpty({ message: '工价ID不能为空' })
  @IsNumber()
  work_price_id: number;

  @IsNotEmpty({ message: '工价不能为空' })
  @Transform(({ value }: { value: unknown }) => toNumber(value))
  @IsNumber()
  @Min(0, { message: '工价不能小于0' })
  work_price: number;

  @IsNotEmpty({ message: '工价标题不能为空' })
  @IsString()
  work_title: string;

  @IsNotEmpty({ message: '数量不能为空' })
  @Transform(({ value }: { value: unknown }) => toNumber(value))
  @IsNumber()
  @Min(0, { message: '数量不能小于0' })
  quantity: number;

  @IsNotEmpty({ message: '工种名称不能为空' })
  @IsString()
  work_kind_name: string;

  @IsNotEmpty({ message: '工种编码不能为空' })
  @IsString()
  work_kind_code: string;

  @IsNotEmpty({ message: '单位名称不能为空' })
  @IsString()
  labour_cost_name: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toOptionalString(value))
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
  @Transform(({ value }: { value: unknown }) => toNumber(value))
  @IsNumber()
  @Min(0, { message: '面积不能小于0' })
  area: number | string;

  @IsNotEmpty({ message: '总价不能为空' })
  @Transform(({ value }: { value: unknown }) => toNumber(value))
  @IsNumber()
  @Min(0, { message: '总价不能小于0' })
  total_price: number;

  @IsNotEmpty({ message: '工价列表不能为空' })
  @IsArray({ message: '工价列表必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => WorkPriceItemDto)
  work_price_list: WorkPriceItemDto[];

  @IsOptional()
  @IsString()
  @IsIn(['auto', 'manual'], { message: '工长费模式必须是auto或manual' })
  gangmaster_cost_mode?: 'auto' | 'manual';

  @ValidateIf(
    (dto: CreateWorkPriceItemsDto) => dto.gangmaster_cost_mode === 'manual',
  )
  @Transform(({ value }: { value: unknown }) => toNumber(value))
  @IsNumber({}, { message: '本次工长费必须是数字' })
  @Min(0, { message: '本次工长费不能小于0' })
  manual_gangmaster_cost?: number;
}
