import {
  IsNotEmpty,
  IsNumber,
} from 'class-validator';

/**
 * 一键支付辅材DTO（按订单ID批量支付）
 */
export class BatchPaymentMaterialsDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsNumber({}, { message: '订单ID必须是数字' })
  orderId: number; // 订单ID
}

