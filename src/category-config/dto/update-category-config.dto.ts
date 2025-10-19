import { IsOptional, IsString } from 'class-validator';

/**
 * 更新类目配置DTO
 */
export class UpdateCategoryConfigDto {
  /**
   * 类目名称
   */
  @IsOptional()
  @IsString({ message: '类目名称必须是字符串' })
  category_name?: string;

  /**
   * 类目图片
   */
  @IsOptional()
  @IsString({ message: '类目图片必须是字符串' })
  category_image?: string;
}
