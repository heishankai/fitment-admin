import {
  IsString,
  IsArray,
  IsOptional,
  IsNotEmpty,
  ValidateNested,
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

  // 工种ID
  @IsString()
  @IsOptional()
  workKindId?: string;

  // 工种名称
  @IsString()
  @IsOptional()
  workKindName?: string;
}

