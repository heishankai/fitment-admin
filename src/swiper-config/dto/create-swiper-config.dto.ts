import {
  IsArray,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateSwiperConfigDto {
  @IsArray()
  @IsNotEmpty({ message: '轮播图图片不能为空' })
  @IsString({ each: true, message: '轮播图图片必须是字符串数组' })
  swiper_image: string[]; // 轮播图图片数组
}
