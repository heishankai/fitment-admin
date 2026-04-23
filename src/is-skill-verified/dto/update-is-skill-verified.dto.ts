import { IsOptional, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ImageUrlDto {
  @IsString()
  url: string;
}

class VideoUrlDto {
  @IsString()
  url: string;
}

/**
 * 更新技能认证信息DTO
 */
export class UpdateIsSkillVerifiedDto {
  /**
   * 承诺图片
   */
  @IsOptional()
  @IsArray({ message: '承诺图片必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => ImageUrlDto)
  promise_image?: Array<{ url: string }>;

  /**
   * 操作视频
   */
  @IsOptional()
  @IsArray({ message: '操作视频必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => VideoUrlDto)
  operation_video?: Array<{ url: string }>;

  /**
   * 工种编码
   */
  @IsOptional()
  @IsString({ message: '工种编码必须是字符串' })
  work_kind_code?: string;

  /**
   * 工种名称
   */
  @IsOptional()
  @IsString({ message: '工种名称必须是字符串' })
  work_kind_name?: string;

  /**
   * 从业年限
   */
  @IsOptional()
  @IsString({ message: '从业年限必须是字符串' })
  work_years?: string;

  /**
   * 技能介绍
   */
  @IsOptional()
  @IsString({ message: '技能介绍必须是字符串' })
  skill_intro?: string;
}

