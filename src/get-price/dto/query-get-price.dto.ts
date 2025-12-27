import { IsOptional, IsString, IsNumber, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 分页查询获取报价DTO
 */
export class QueryGetPriceDto {
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
   * 城市（模糊匹配 location 字段）
   */
  @IsOptional()
  @IsString({ message: '城市必须是字符串' })
  city?: string;

  /**
   * 手机号（精确匹配）
   */
  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  phone?: string;

  /**
   * 房屋类型（精确匹配，new 或 old）
   */
  @IsOptional()
  @IsString({ message: '房屋类型必须是字符串' })
  @IsIn(['new', 'old'], { message: '房屋类型必须是 new 或 old' })
  houseType?: string;
}

