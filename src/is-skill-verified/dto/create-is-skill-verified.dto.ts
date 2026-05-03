import {
  IsString,
  IsArray,
  IsOptional,
  IsNotEmpty,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class ImageUrlDto {
  @IsString()
  @IsNotEmpty({ message: '图片URL不能为空' })
  url: string;
}

class VideoUrlDto {
  @IsString()
  @IsNotEmpty({ message: '视频URL不能为空' })
  url: string;
}

export class CreateIsSkillVerifiedDto {
  /**
   * 关联的工匠用户 ID（非必填）
   */
  @IsOptional()
  @IsInt({ message: '关联工匠用户ID必须是整数' })
  @Min(1, { message: '关联工匠用户ID无效' })
  relatedCraftsmanUserId?: number;

  // 承诺图片
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ImageUrlDto)
  promise_image?: Array<{ url: string }>;

  // 操作视频
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => VideoUrlDto)
  operation_video?: Array<{ url: string }>;

  // 工种编码
  @IsString()
  @IsOptional()
  work_kind_code?: string;

  // 工种名称
  @IsString()
  @IsOptional()
  work_kind_name?: string;

  // 从业年限
  @IsString()
  @IsOptional()
  work_years?: string;

  // 技能介绍
  @IsString()
  @IsOptional()
  skill_intro?: string;
}

