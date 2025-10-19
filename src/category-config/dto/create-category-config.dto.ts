import {
  IsString,
  IsNotEmpty,
} from 'class-validator';

export class CreateCategoryConfigDto {
  @IsString()
  @IsNotEmpty({ message: '类目名称不能为空' })
  category_name: string; // 类目名称

  @IsString()
  @IsNotEmpty({ message: '类目图片不能为空' })
  category_image: string; // 类目图片
}
