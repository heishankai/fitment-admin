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

export class CreateHomePageAuditDto {
  // 简介
  @IsString()
  @IsOptional()
  intro?: string;

  // 获奖情况
  @IsString()
  @IsOptional()
  awards?: string;

  // 获奖图片
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ImageUrlDto)
  awards_image?: Array<{ url: string }>;
}

