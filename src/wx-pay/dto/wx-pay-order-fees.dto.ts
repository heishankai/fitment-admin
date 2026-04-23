import { IsNotEmpty, IsNumber, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { WX_PAY_CONFIG } from '../../common/constants/app.constants';

const ORDER_FEE_PAY_TYPES = [
  WX_PAY_CONFIG.payType.ORDER_PLATFORM_SERVICE_FEE,
  WX_PAY_CONFIG.payType.ORDER_GANGMASTER_COST,
] as const;

/**
 * 按订单支付：平台服务费 或 工长费（由 pay_type 区分）
 */
export class WxPayOrderFeesDto {
  @IsNotEmpty({ message: '支付类型不能为空' })
  @IsIn(ORDER_FEE_PAY_TYPES, {
    message: `pay_type 必须是 ${ORDER_FEE_PAY_TYPES.join(' 或 ')}`,
  })
  pay_type: (typeof ORDER_FEE_PAY_TYPES)[number];

  @IsNotEmpty({ message: '订单ID不能为空' })
  @Type(() => Number)
  @IsNumber()
  order_id: number;

  @IsNotEmpty({ message: '支付金额不能为空' })
  @Type(() => Number)
  @IsNumber({ allowNaN: false }, { message: '支付金额必须是有效数字' })
  @Min(0.01, { message: '支付金额必须大于0' })
  order_amount: number;
}
