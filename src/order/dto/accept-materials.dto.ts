import {
  IsNotEmpty,
  IsNumber,
} from 'class-validator';

/**
 * 验收辅材DTO
 */
export class AcceptMaterialsDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsNumber()
  order_id: number; // 订单ID

  @IsNotEmpty({ message: '辅材索引不能为空' })
  @IsNumber()
  materials_item: number; // materials_list 中的索引
}
