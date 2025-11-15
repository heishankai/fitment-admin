import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 分页查询工种配置DTO
 */
export class QueryWorkKindDto {
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
   * 工种名称（模糊匹配）
   */
  @IsOptional()
  @IsString({ message: '工种名称必须是字符串' })
  work_kind_name?: string;
}

