import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
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

  /** 可选：指定支付金额明细下标；不传则支付当前所有未付明细 */
  @IsOptional()
  @IsArray({ message: 'fee_indexes 必须是数组' })
  @ArrayMinSize(1, { message: 'fee_indexes 至少包含一个下标' })
  @Type(() => Number)
  @IsNumber({}, { each: true, message: 'fee_indexes 必须是数字数组' })
  fee_indexes?: number[];

  /** 兼容旧前端：单个明细下标 */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'fee_index 必须是数字' })
  fee_index?: number;

  @IsNotEmpty({ message: '支付金额不能为空' })
  @Type(() => Number)
  @IsNumber({ allowNaN: false }, { message: '支付金额必须是有效数字' })
  @Min(0.01, { message: '支付金额必须大于0' })
  order_amount: number;
}
