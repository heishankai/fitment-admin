import {
  IsOptional,
  IsNumber,
  Min,
  IsString,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 查询提现申请DTO
 */
export class QueryWithdrawDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: '页码必须大于0' })
  pageIndex?: number = 1; // 页码，默认1

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: '每页数量必须大于0' })
  pageSize?: number = 10; // 每页数量，默认10

  @IsOptional()
  @IsString()
  craftsman_user_name?: string; // 工匠用户名（可选）

  @IsOptional()
  @IsString()
  phone?: string; // 工匠手机号（可选）

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  status?: number; // 状态筛选（可选）

  /**
   * 申请时间范围：YYYY-MM-DD 格式数组，例如 ["2025-12-12", "2026-01-07"]（用于查询申请日期）
   */
  @IsOptional()
  @IsArray({ message: '申请时间范围必须是数组' })
  @ArrayMinSize(2, { message: '申请时间范围数组必须包含2个元素' })
  @ArrayMaxSize(2, { message: '申请时间范围数组必须包含2个元素' })
  @IsString({ each: true, message: '申请时间范围数组中的每个元素必须是字符串格式 YYYY-MM-DD' })
  apply_time?: string[];
}
