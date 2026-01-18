import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 分页查询订单DTO
 */
export class QueryOrderDto {
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
   * 工匠用户名（模糊匹配）
   */
  @IsOptional()
  @IsString({ message: '工匠用户名必须是字符串' })
  craftsman_user_name?: string;

  /**
   * 微信用户名（模糊匹配）
   */
  @IsOptional()
  @IsString({ message: '微信用户名必须是字符串' })
  wechat_user_name?: string;

  /**
   * 工匠用户手机号（精确匹配）
   */
  @IsOptional()
  @IsString({ message: '工匠用户手机号必须是字符串' })
  craftsman_user_phone?: string;

  /**
   * 微信用户手机号（精确匹配）
   */
  @IsOptional()
  @IsString({ message: '微信用户手机号必须是字符串' })
  wechat_user_phone?: string;

  /**
   * 工种名称（模糊匹配，查询订单表中的 work_kind_name 字段）
   */
  @IsOptional()
  @IsString({ message: '工种名称必须是字符串' })
  work_kind_name?: string;

  /**
   * 订单号（精确匹配）
   */
  @IsOptional()
  @IsString({ message: '订单号必须是字符串' })
  order_no?: string;

  /**
   * 订单状态（精确匹配，1: 待接单, 2: 已接单, 3: 已完成, 4: 已取消）
   */
  @IsOptional()
  @IsNumber({}, { message: '订单状态必须是数字' })
  @Type(() => Number)
  order_status?: number;

  /**
   * 订单类型（精确匹配，工长订单:gangmaster ,工匠订单:craftsman）
   */
  @IsOptional()
  @IsString({ message: '订单类型必须是字符串' })
  order_type?: string;

  /**
   * 日期范围：YYYY-MM-DD 格式数组，例如 ["2026-01-08", "2026-01-21"]（用于查询创建日期）
   */
  @IsOptional()
  @IsArray({ message: '日期范围必须是数组' })
  @ArrayMinSize(2, { message: '日期范围数组必须包含2个元素' })
  @ArrayMaxSize(2, { message: '日期范围数组必须包含2个元素' })
  @IsString({
    each: true,
    message: '日期范围数组中的每个元素必须是字符串格式 YYYY-MM-DD',
  })
  date_range?: string[];
}
