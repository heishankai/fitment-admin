import {
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  IsNumber,
} from 'class-validator';

/**
 * 按辅材ID列表批量支付DTO
 */
export class BatchPaymentByMaterialsIdsDto {
  @IsNotEmpty({ message: '辅材ID列表不能为空' })
  @IsArray({ message: '辅材ID列表必须是数组' })
  @ArrayMinSize(1, { message: '辅材ID列表至少包含一个ID' })
  @IsNumber({}, { each: true, message: '辅材ID必须是数字' })
  materialsIds: number[]; // 辅材ID列表（未支付的辅材ID）
}
