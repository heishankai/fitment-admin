import { IsOptional, IsArray, IsString } from 'class-validator';

/**
 * 更新轮播图配置DTO
 */
export class UpdateSwiperConfigDto {
  /**
   * 轮播图图片数组
   */
  @IsOptional()
  @IsArray({ message: '轮播图图片必须是数组' })
  @IsString({ each: true, message: '轮播图图片必须是字符串数组' })
  swiper_image?: string[];
}
