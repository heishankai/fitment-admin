import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsIn,
} from 'class-validator';

/**
 * 验收工价DTO
 */
export class AcceptWorkPriceDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsNumber()
  order_id: number; // 订单ID

  @IsNotEmpty({ message: '验收类型不能为空' })
  @IsString()
  @IsIn(['work_prices', 'sub_work_prices'], {
    message: '验收类型必须是 work_prices 或 sub_work_prices',
  })
  accepted_type: 'work_prices' | 'sub_work_prices'; // 验收类型

  @IsOptional()
  @IsNumber()
  prices_item?: number; // 工价单中的索引（可选，当 accepted_type 为 work_prices 时表示 prices_list 索引，为 sub_work_prices 时表示 sub_work_prices 数组索引）
}
