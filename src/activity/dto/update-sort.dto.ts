import {
  IsNotEmpty,
  IsArray,
  IsNumber,
  ArrayMinSize,
} from 'class-validator';

/**
 * 更新活动排序DTO
 */
export class UpdateSortDto {
  /**
   * 排序后的活动ID数组，数组顺序即为排序顺序
   * 例如：[3, 1, 2] 表示ID为3的活动排第一，ID为1的活动排第二，ID为2的活动排第三
   */
  @IsNotEmpty({ message: '排序ID数组不能为空' })
  @IsArray({ message: 'ids必须是数组' })
  @ArrayMinSize(1, { message: '排序ID数组不能为空' })
  @IsNumber({}, { each: true, message: '数组中的每个元素必须是数字' })
  ids: number[];
}
