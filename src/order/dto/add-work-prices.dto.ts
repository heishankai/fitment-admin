import {
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 工价项
 */
export class WorkPriceItem {
  @IsNotEmpty({ message: '总价不能为空' })
  @IsNumber()
  @Min(0, { message: '总价不能小于0' })
  total_price: number;

  @IsNotEmpty({ message: '价格列表不能为空' })
  @IsArray({ message: '价格列表必须是数组' })
  prices_list: any[]; // 可以存储任意数据
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

