import { IsOptional, IsArray, IsString, IsNumber, IsIn } from 'class-validator';

/**
 * 更新首页审核信息DTO
 */
export class UpdateHomePageAuditDto {
  /**
   * 工地心得
   */
  @IsOptional()
  @IsString({ message: '工地心得必须是字符串' })
  publish_text?: string;

  /**
   * 工地图片
   */
  @IsOptional()
  @IsArray({ message: '工地图片必须是数组' })
  @IsString({ each: true, message: '每张图片必须是字符串URL' })
  publish_images?: string[];

  /**
   * 审核状态：1-已发布 2-审核中 3-审核失败
   */
  @IsOptional()
  @IsNumber()
  @IsIn([1, 2, 3], { message: '审核状态必须是 1、2 或 3' })
  status?: number;

  /**
   * 状态名称
   */
  @IsOptional()
  @IsString({ message: '状态名称必须是字符串' })
  status_name?: string;
}
