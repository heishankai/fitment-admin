import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 分页查询案例查询记录DTO
 */
export class QueryCaseQueryDto {
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
   * 小区名称（模糊匹配）
   */
  @IsOptional()
  @IsString({ message: '小区名称必须是字符串' })
  housing_name?: string;

  /**
   * 城市代码（精确匹配）
   */
  @IsOptional()
  @IsString({ message: '城市代码必须是字符串' })
  city_code?: string;

  /**
   * 户型（模糊匹配）
   */
  @IsOptional()
  @IsString({ message: '户型必须是字符串' })
  housing_type?: string;

  /**
   * 城市名称（精确匹配）
   */
  @IsOptional()
  @IsString({ message: '城市名称必须是字符串' })
  city_name?: string;
}
