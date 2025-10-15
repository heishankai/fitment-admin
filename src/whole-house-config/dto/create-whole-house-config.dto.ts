import {
  IsString,
  IsArray,
  IsNotEmpty,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// 工种配置 DTO
export class WorkConfigDto {
  @IsString()
  @IsNotEmpty({ message: '工种标题不能为空' })
  work_title: string; // 工种标题

  @IsNotEmpty({ message: '价格不能为空' })
  price: any; // 价格

  @IsString()
  @IsNotEmpty({ message: '计价说明不能为空' })
  pricing_description: string; // 计价说明

  @IsString()
  @IsNotEmpty({ message: '服务范围不能为空' })
  service_scope: string; // 服务范围

  @IsArray()
  @IsString({ each: true })
  display_images: string[]; // 展示图片

  @IsArray()
  @IsString({ each: true })
  service_details: string[]; // 服务详情
}

export class CreateWholeHouseConfigDto {
  @IsString()
  @IsNotEmpty({ message: '分类名称不能为空' })
  category_name: string; // 分类名称

  @IsArray()
  @ArrayMinSize(1, { message: '至少需要一个工种配置' })
  @ValidateNested({ each: true })
  @Type(() => WorkConfigDto)
  work_configs: WorkConfigDto[]; // 工种配置
}
