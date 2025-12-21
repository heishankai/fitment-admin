import { IsOptional, IsString, IsNumber, Min, Max, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 分页查询平台收支记录DTO
 */
export class QueryPlatformIncomeRecordDto {
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
   * 订单号（精确匹配）
   */
  @IsOptional()
  @IsString({ message: '订单号必须是字符串' })
  order_no?: string;

  /**
   * 收入时间区间：YYYY-MM-DD 格式数组，例如 ["2026-01-08", "2026-01-21"]
   */
  @IsOptional()
  @IsArray({ message: '收入时间区间必须是数组' })
  @ArrayMinSize(2, { message: '收入时间区间数组必须包含2个元素' })
  @ArrayMaxSize(2, { message: '收入时间区间数组必须包含2个元素' })
  @IsString({ each: true, message: '收入时间区间数组中的每个元素必须是字符串格式 YYYY-MM-DD' })
  income_time?: string[];
}

