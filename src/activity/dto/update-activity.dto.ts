import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * 更新活动配置DTO
 */
export class UpdateActivityDto {
  /**
   * 标题
   */
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '标题长度不能超过200个字符' })
  title?: string;

  /**
   * 描述
   */
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * 图片URL
   */
  @IsOptional()
  @IsString()
  image?: string;

  /**
   * 链接文本
   */
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '链接文本长度不能超过100个字符' })
  linkText?: string;

  /**
   * 链接URL
   */
  @IsOptional()
  @IsString()
  linkUrl?: string;
}
