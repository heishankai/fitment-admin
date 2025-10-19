import { IsOptional, IsString, IsNumber, IsArray, Min } from 'class-validator';

/**
 * 更新工种类型DTO
 */
export class UpdateWorkTypeDto {
  /**
   * 工种名称
   */
  @IsOptional()
  @IsString({ message: '工种名称必须是字符串' })
  work_title?: string;

  /**
   * 工种价格
   */
  @IsOptional()
  work_price?: any;

  /**
   * 计价说明
   */
  @IsOptional()
  @IsString({ message: '计价说明必须是字符串' })
  pricing_description?: string;

  /**
   * 服务范围
   */
  @IsOptional()
  @IsString({ message: '服务范围必须是字符串' })
  service_scope?: string;

  /**
   * 展示图片
   */
  @IsOptional()
  @IsArray({ message: '展示图片必须是数组' })
  display_images?: string[];

  /**
   * 服务详情
   */
  @IsOptional()
  @IsArray({ message: '服务详情必须是数组' })
  service_details?: string[];
}
