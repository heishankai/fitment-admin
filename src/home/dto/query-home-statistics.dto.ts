import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * 查询首页统计数据DTO
 */
export class QueryHomeStatisticsDto {
  @IsNotEmpty({ message: '月份不能为空' })
  @IsString({ message: '月份必须是字符串' })
  @Matches(/^\d{4}-\d{2}$/, { message: '月份格式不正确，应为 YYYY-MM 格式' })
  month: string; // 月份，格式：2025-10
}
