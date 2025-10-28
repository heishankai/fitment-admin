import { IsNumber, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 分页查询微信地址DTO
 */
export class QueryWechatAddressDto {
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
   * 微信用户ID（可选）
   */
  @IsOptional()
  @IsNumber({}, { message: '微信用户ID必须是数字' })
  @Type(() => Number)
  wechat_user_id?: number;
}
