import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
} from 'class-validator';

/**
 * 创建施工进度DTO
 */
export class CreateConstructionProgressDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsNumber()
  orderId: number; // 订单ID

  @IsNotEmpty({ message: '上班打卡时间不能为空' })
  @IsString()
  start_time: string; // 上班打卡时间

  @IsNotEmpty({ message: '下班打卡时间不能为空' })
  @IsString()
  end_time: string; // 下班打卡时间

  @IsNotEmpty({ message: '打卡位置不能为空' })
  @IsString()
  location: string; // 打卡位置

  @IsOptional()
  @IsArray({ message: '打卡照片必须是数组' })
  @IsString({ each: true, message: '照片URL必须是字符串' })
  photos?: string[]; // 打卡照片
}
