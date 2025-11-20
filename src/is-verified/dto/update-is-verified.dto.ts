import { IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ImageUrlDto {
  @IsString()
  url: string;
}

/**
 * 更新实名认证信息DTO
 */
export class UpdateIsVerifiedDto {
  /**
   * 证件正面图片
   */
  @IsOptional()
  @IsArray({ message: '证件正面图片必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => ImageUrlDto)
  card_front_image?: Array<{ url: string }>;

  /**
   * 证件反面图片
   */
  @IsOptional()
  @IsArray({ message: '证件反面图片必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => ImageUrlDto)
  card_reverse_image?: Array<{ url: string }>;

  /**
   * 证件名称
   */
  @IsOptional()
  @IsString({ message: '证件名称必须是字符串' })
  card_name?: string;

  /**
   * 证件号码
   */
  @IsOptional()
  @IsString({ message: '证件号码必须是字符串' })
  card_number?: string;

  /**
   * 证件住址
   */
  @IsOptional()
  @IsString({ message: '证件住址必须是字符串' })
  card_address?: string;

  /**
   * 证件有效期开始日期
   */
  @IsOptional()
  @IsString({ message: '证件有效期开始日期必须是字符串' })
  card_start_date?: string;

  /**
   * 证件有效期结束日期
   */
  @IsOptional()
  @IsString({ message: '证件有效期结束日期必须是字符串' })
  card_end_date?: string;
}

