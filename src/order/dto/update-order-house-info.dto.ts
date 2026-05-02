import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * 更新订单房屋信息DTO
 */
export class UpdateOrderHouseInfoDto {
  @IsOptional()
  @IsString({ message: '小区名称必须是字符串' })
  @MaxLength(200, { message: '小区名称不能超过200字' })
  housing_name?: string;

  @IsOptional()
  @IsString({ message: '详细地址必须是字符串' })
  @MaxLength(200, { message: '详细地址不能超过200字' })
  location?: string;

  @IsOptional()
  @IsString({ message: '户型必须是字符串' })
  @MaxLength(50, { message: '户型不能超过50字' })
  roomType?: string;

  @IsOptional()
  @IsNumber({}, { message: '面积必须是数字' })
  @Min(0, { message: '面积不能小于0' })
  @Type(() => Number)
  area?: number;

  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  @MaxLength(800, { message: '备注不能超过800字' })
  remark?: string;
}
