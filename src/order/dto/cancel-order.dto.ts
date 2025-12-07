import { IsNumber, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 取消订单DTO
 */
export class CancelOrderDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsNumber({}, { message: '订单ID必须是数字' })
  orderId: number; // 订单ID

  @IsOptional()
  @IsString({ message: '取消原因必须是字符串' })
  reason?: string; // 取消原因（可选）
}
