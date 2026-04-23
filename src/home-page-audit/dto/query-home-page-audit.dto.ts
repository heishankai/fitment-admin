import { IsOptional, IsString, IsNumber, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 分页查询首页审核记录DTO
 */
export class QueryHomePageAuditDto {
  /**
   * 页码，从1开始
   */
  @IsOptional()
  @IsNumber({}, { message: '页码必须是数字' })
  @Type(() => Number)
  @Min(1, { message: '页码不能小于1' })
  pageIndex?: number = 1;

  /**
   * 每页大小
   */
  @IsOptional()
  @IsNumber({}, { message: '每页大小必须是数字' })
  @Type(() => Number)
  @Min(1, { message: '每页大小不能小于1' })
  @Max(100, { message: '每页大小不能超过100' })
  pageSize?: number = 10;

  /**
   * 用户昵称（模糊匹配）
   */
  @IsOptional()
  @IsString({ message: '用户昵称必须是字符串' })
  nickname?: string;

  /**
   * 手机号（精确匹配）
   */
  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  phone?: string;

  /**
   * 审核状态：1-已发布 2-审核中 3-审核失败
   */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @IsIn([1, 2, 3], { message: '审核状态必须是 1、2 或 3' })
  status?: number;
}
