import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * 更新轮播图配置DTO
 */
export class UpdateSwiperConfigDto {
  /**
   * 轮播图图片URL
   */
  @IsOptional()
  @IsString({ message: '轮播图图片必须是字符串' })
  swiper_image?: string;

  /**
   * 标题
   */
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '标题长度不能超过100个字符' })
  title?: string;

  /**
   * 描述
   */
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '描述长度不能超过200个字符' })
  description?: string;
}
