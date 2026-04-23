import {
  IsNotEmpty,
  IsNumber,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

/**
 * 批量验收：仅传工价项 ID 列表，接口会将列表内工价项全部验收（已验收/未支付等不满足条件时会报错且整批不执行）
 */
export class BatchAcceptWorkPriceDto {
  @IsNotEmpty({ message: '工价项ID列表不能为空' })
  @IsArray({ message: '工价项ID列表必须是数组' })
  @ArrayMinSize(1, { message: '工价项ID列表至少包含一个ID' })
  @IsNumber({}, { each: true, message: '工价项ID必须是数字' })
  work_price_item_ids: number[];
}
