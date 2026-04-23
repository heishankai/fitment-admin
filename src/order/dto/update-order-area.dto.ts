import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 更新订单平米数DTO
 */
export class UpdateOrderAreaDto {
  @IsNotEmpty({ message: '面积不能为空' })
  @IsNumber({}, { message: '面积必须是数字' })
  @Min(0, { message: '面积不能小于0' })
  @Type(() => Number)
  area: number;
}
