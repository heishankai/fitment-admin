import {
  IsOptional,
  IsString,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * 更新欢迎页配置DTO
 */
export class UpdateWelcomeDto {
  /**
   * Logo图片URL
   */
  @IsOptional()
  @IsString({ message: 'Logo必须是字符串' })
  logo?: string;

  /**
   * 背景图片URL
   */
  @IsOptional()
  @IsString({ message: '背景图片必须是字符串' })
  background_image?: string;

  /**
   * 标题
   */
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '标题长度不能超过200个字符' })
  title?: string;

  /**
   * 副标题
   */
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '副标题长度不能超过500个字符' })
  subtitle?: string;

  /**
   * 倒计时（数字类型，字符串会自动转换为数字）
   */
  @IsOptional()
  @Transform(({ value }) => {
    // 支持字符串和数字两种类型，统一转换为数字
    if (typeof value === 'string') {
      const num = parseFloat(value);
      if (isNaN(num)) {
        throw new Error('倒计时必须是有效的数字');
      }
      return num;
    }
    if (typeof value === 'number') {
      return value;
    }
    return value;
  })
  @IsNumber({}, { message: '倒计时必须是数字' })
  count_down?: number;

  /**
   * 版权信息
   */
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '版权信息长度不能超过200个字符' })
  copyright?: string;
}
