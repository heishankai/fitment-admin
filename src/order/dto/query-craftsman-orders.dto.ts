import { IsArray, IsOptional, IsNumber } from 'class-validator';

/**
 * 查询工匠订单DTO
 */
export class QueryCraftsmanOrdersDto {
  /**
   * 订单状态数组，例如 [1,2,3,4] 表示待接单、已接单、已完成、已取消
   */
  @IsOptional()
  @IsArray({ message: 'order_status 必须是数组' })
  @IsNumber({}, { each: true, message: '订单状态值必须是数字' })
  order_status?: number[];
}

