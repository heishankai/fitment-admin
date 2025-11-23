import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlatformNoticeDto {
  @IsString()
  @IsNotEmpty({ message: '公告标题不能为空' })
  notice_title: string; // 公告标题

  @IsString()
  @IsNotEmpty({ message: '公告内容不能为空' })
  notice_content: string; // 公告内容

  @IsNotEmpty({ message: '公告类型不能为空' })
  @IsIn([1, 2, '1', '2'], { message: '公告类型必须是 1（用户端公告）或 2（工匠端公告）' })
  @Type(() => String)
  notice_type: string | number; // 公告类型：1-用户端公告，2-工匠端公告

  @IsOptional()
  @IsArray({ message: '公告图片必须是数组' })
  @IsString({ each: true, message: '公告图片数组中的每一项必须是字符串' })
  notice_image?: string[]; // 公告图片URL数组
}

