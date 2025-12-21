import {
  IsNotEmpty,
  IsNumber,
} from 'class-validator';

/**
 * 确认工价项平台服务费支付DTO
 */
export class ConfirmWorkPriceServiceFeeDto {
  @IsNotEmpty({ message: '工价项ID不能为空' })
  @IsNumber()
  work_price_item_id: number; // 工价项ID
}

