import {
  IsNotEmpty,
  IsNumber,
} from 'class-validator';

/**
 * 单个工价验收DTO
 */
export class AcceptSingleWorkPriceDto {
  @IsNotEmpty({ message: '工价项ID不能为空' })
  @IsNumber()
  work_price_item_id: number; // 工价项ID
}

