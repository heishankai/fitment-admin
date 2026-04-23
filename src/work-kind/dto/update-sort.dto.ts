import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber } from 'class-validator';

/**
 * 更新工种配置排序DTO（拖拽排序）
 */
export class UpdateSortDto {
  /**
   * 排序后的工种ID数组，数组顺序即为排序顺序
   * 例如：[3, 1, 2] 表示ID为3的工种排第一，ID为1的工种排第二
   */
  @IsNotEmpty({ message: '排序ID数组不能为空' })
  @IsArray({ message: 'ids必须是数组' })
  @ArrayMinSize(1, { message: '排序ID数组不能为空' })
  @IsNumber({}, { each: true, message: '数组中的每个元素必须是数字' })
  ids: number[];
}

