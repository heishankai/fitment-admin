import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateActivityDto {
  @IsString()
  @IsNotEmpty({ message: '标题不能为空' })
  @MaxLength(200, { message: '标题长度不能超过200个字符' })
  title: string; // 标题

  @IsString()
  @IsNotEmpty({ message: '描述不能为空' })
  description: string; // 描述

  @IsString()
  @IsNotEmpty({ message: '图片不能为空' })
  image: string; // 图片URL

  @IsString()
  @IsNotEmpty({ message: '链接文本不能为空' })
  @MaxLength(100, { message: '链接文本长度不能超过100个字符' })
  linkText: string; // 链接文本

  @IsString()
  @IsNotEmpty({ message: '链接URL不能为空' })
  linkUrl: string; // 链接URL
}
