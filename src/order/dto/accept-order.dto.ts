import { IsNumber, IsNotEmpty } from 'class-validator';

/**
 * 接单DTO
 */
export class AcceptOrderDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsNumber({}, { message: '订单ID必须是数字' })
  orderId: number; // 订单ID
}

