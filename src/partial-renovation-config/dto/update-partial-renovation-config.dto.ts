import { IsOptional, IsString, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

// 工种配置 DTO
export class UpdateWorkConfigDto {
  @IsOptional()
  @IsString({ message: '工种标题必须是字符串' })
  work_title?: string; // 工种标题

  @IsOptional()
  price?: any; // 价格

  @IsOptional()
  @IsString({ message: '计价说明必须是字符串' })
  pricing_description?: string; // 计价说明

  @IsOptional()
  @IsString({ message: '服务范围必须是字符串' })
  service_scope?: string; // 服务范围

  @IsOptional()
  @IsArray({ message: '展示图片必须是数组' })
  @IsString({ each: true })
  display_images?: string[]; // 展示图片

  @IsOptional()
  @IsArray({ message: '服务详情必须是数组' })
  @IsString({ each: true })
  service_details?: string[]; // 服务详情
}

export class UpdatePartialRenovationConfigDto {
  @IsOptional()
  @IsString({ message: '分类名称必须是字符串' })
  category_name?: string; // 分类名称

  @IsOptional()
  @IsArray({ message: '工种配置必须是数组' })
  @ArrayMinSize(1, { message: '至少需要一个工种配置' })
  @ValidateNested({ each: true })
  @Type(() => UpdateWorkConfigDto)
  work_configs?: UpdateWorkConfigDto[]; // 工种配置
}
