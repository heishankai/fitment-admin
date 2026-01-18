import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateSwiperConfigDto {
  @IsString()
  @IsNotEmpty({ message: '轮播图图片不能为空' })
  swiper_image: string; // 轮播图图片URL

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '标题长度不能超过100个字符' })
  title?: string; // 标题

  @IsString()
  @IsOptional()
  @MaxLength(200, { message: '描述长度不能超过200个字符' })
  description?: string; // 描述
}
