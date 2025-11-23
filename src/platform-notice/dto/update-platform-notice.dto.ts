import { IsOptional, IsString, IsIn, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 更新平台公告DTO
 */
export class UpdatePlatformNoticeDto {
  /**
   * 公告标题
   */
  @IsOptional()
  @IsString({ message: '公告标题必须是字符串' })
  notice_title?: string;

  /**
   * 公告内容
   */
  @IsOptional()
  @IsString({ message: '公告内容必须是字符串' })
  notice_content?: string;

  /**
   * 公告类型：1-用户端公告，2-工匠端公告
   */
  @IsOptional()
  @IsIn([1, 2, '1', '2'], { message: '公告类型必须是 1（用户端公告）或 2（工匠端公告）' })
  @Type(() => String)
  notice_type?: string | number;

  /**
   * 公告图片URL数组
   */
  @IsOptional()
  @IsArray({ message: '公告图片必须是数组' })
  @IsString({ each: true, message: '公告图片数组中的每一项必须是字符串' })
  notice_image?: string[];
}

