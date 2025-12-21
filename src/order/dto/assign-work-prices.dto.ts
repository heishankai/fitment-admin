import {
  IsArray,
  IsNumber,
  IsNotEmpty,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 分配工价给工匠DTO
 */
export class AssignWorkPricesDto {
  /**
   * 工价ID列表
   */
  @IsArray({ message: '工价列表必须是数组' })
  @ArrayMinSize(1, { message: '工价列表至少包含一个工价' })
  @IsNumber({}, { each: true, message: '工价ID必须是数字' })
  @Type(() => Number)
  work_price_list: number[];

  /**
   * 工匠ID
   */
  @IsNotEmpty({ message: '工匠ID不能为空' })
  @IsNumber({}, { message: '工匠ID必须是数字' })
  @Type(() => Number)
  @Min(1, { message: '工匠ID必须大于0' })
  craftsman_id: number;

  /**
   * 父订单ID
   */
  @IsNotEmpty({ message: '父订单ID不能为空' })
  @IsNumber({}, { message: '父订单ID必须是数字' })
  @Type(() => Number)
  @Min(1, { message: '父订单ID必须大于0' })
  parent_order_id: number;
}

