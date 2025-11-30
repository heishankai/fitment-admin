import { IsString, IsArray, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * 施工进度项
 */
export class ConstructionProgressItem {
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

/**
 * 添加施工进度DTO
 */
export class AddConstructionProgressDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  orderId: number;

  @IsNotEmpty({ message: '施工进度信息不能为空' })
  progress: ConstructionProgressItem;
}

