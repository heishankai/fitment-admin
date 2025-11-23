import { IsOptional, IsString, IsNumber, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 分页查询平台公告DTO
 */
export class QueryPlatformNoticeDto {
  /**
   * 页码，从1开始
   */
  @IsNumber({}, { message: '页码必须是数字' })
  @Type(() => Number)
  @Min(1, { message: '页码不能小于1' })
  pageIndex: number;

  /**
   * 每页大小
   */
  @IsNumber({}, { message: '每页大小必须是数字' })
  @Type(() => Number)
  @Min(1, { message: '每页大小不能小于1' })
  @Max(100, { message: '每页大小不能超过100' })
  pageSize: number;

  /**
   * 日期：YYYY-MM-DD 格式（用于查询创建日期）
   */
  @IsOptional()
  @IsString({ message: '日期必须是字符串格式 YYYY-MM-DD' })
  date?: string;

  /**
   * 创建时间（用于排序，可选）
   */
  @IsOptional()
  @IsString({ message: '创建时间必须是字符串' })
  create_time?: string;

  /**
   * 公告标题（模糊匹配）
   */
  @IsOptional()
  @IsString({ message: '公告标题必须是字符串' })
  notice_title?: string;

  /**
   * 公告类型：1-用户端公告，2-工匠端公告
   */
  @IsOptional()
  @IsIn([1, 2, '1', '2'], { message: '公告类型必须是 1（用户端公告）或 2（工匠端公告）' })
  notice_type?: string | number;
}

