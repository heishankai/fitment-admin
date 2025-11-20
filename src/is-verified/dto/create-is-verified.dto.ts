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

export class CreateIsVerifiedDto {
  // 证件正面图片
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ImageUrlDto)
  card_front_image?: Array<{ url: string }>;

  // 证件反面图片
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ImageUrlDto)
  card_reverse_image?: Array<{ url: string }>;

  // 证件名称
  @IsString()
  @IsOptional()
  card_name?: string;

  // 证件号码
  @IsString()
  @IsOptional()
  card_number?: string;

  // 证件住址
  @IsString()
  @IsOptional()
  card_address?: string;

  // 证件有效期开始日期
  @IsString()
  @IsOptional()
  card_start_date?: string;

  // 证件有效期结束日期
  @IsString()
  @IsOptional()
  card_end_date?: string;
}

