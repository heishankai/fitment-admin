import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateWelcomeDto {
  @IsString()
  @IsNotEmpty({ message: 'Logo不能为空' })
  logo: string; // Logo图片URL

  @IsString()
  @IsNotEmpty({ message: '背景图片不能为空' })
  background_image: string; // 背景图片URL

  @IsString()
  @IsNotEmpty({ message: '标题不能为空' })
  @MaxLength(200, { message: '标题长度不能超过200个字符' })
  title: string; // 标题

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: '副标题长度不能超过500个字符' })
  subtitle?: string; // 副标题

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
  @IsNotEmpty({ message: '倒计时不能为空' })
  count_down: number; // 倒计时（数字类型，字符串会自动转换为数字）

  @IsString()
  @IsOptional()
  @MaxLength(200, { message: '版权信息长度不能超过200个字符' })
  copyright?: string; // 版权信息
}
