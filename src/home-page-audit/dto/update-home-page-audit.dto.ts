import { IsOptional, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ImageUrlDto {
  @IsString()
  url: string;
}

/**
 * 更新首页审核信息DTO
 */
export class UpdateHomePageAuditDto {
  /**
   * 简介
   */
  @IsOptional()
  @IsString({ message: '简介必须是字符串' })
  intro?: string;

  /**
   * 获奖情况
   */
  @IsOptional()
  @IsString({ message: '获奖情况必须是字符串' })
  awards?: string;

  /**
   * 获奖图片
   */
  @IsOptional()
  @IsArray({ message: '获奖图片必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => ImageUrlDto)
  awards_image?: Array<{ url: string }>;
}

