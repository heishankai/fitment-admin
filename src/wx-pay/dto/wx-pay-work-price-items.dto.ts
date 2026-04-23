import {
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsIn,
  ArrayMinSize,
  ValidateIf,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WX_PAY_CONFIG } from '../../common/constants/app.constants';

const WORK_PRICE_PAY_TYPES = [
  WX_PAY_CONFIG.payType.WORK_PRICE_SINGLE,
  WX_PAY_CONFIG.payType.WORK_PRICE_BATCH,
  WX_PAY_CONFIG.payType.WORK_PRICE_SUB_SERVICE_FEE_BATCH,
] as const;

/**
 * 工价项微信支付 DTO
 * - work_price_single：workPriceItemId（工价结算款 is_paid）
 * - work_price_batch：workPriceItemIds
 * - work_price_sub_service_fee_batch：workPriceItemIds（子工价 total_service_fee / total_service_fee_is_paid）
 */
export class WxPayWorkPriceItemsDto {
  @IsNotEmpty({ message: '支付类型不能为空' })
  @IsIn(WORK_PRICE_PAY_TYPES, {
    message: `支付类型必须是 ${WORK_PRICE_PAY_TYPES.join(' 或 ')}`,
  })
  pay_type: (typeof WORK_PRICE_PAY_TYPES)[number];

  @ValidateIf((o) => o.pay_type === WX_PAY_CONFIG.payType.WORK_PRICE_SINGLE)
  @IsNotEmpty({ message: '单个支付时 workPriceItemId 不能为空' })
  @Type(() => Number)
  @IsNumber()
  workPriceItemId?: number;

  @ValidateIf(
    (o) =>
      o.pay_type === WX_PAY_CONFIG.payType.WORK_PRICE_BATCH ||
      o.pay_type === WX_PAY_CONFIG.payType.WORK_PRICE_SUB_SERVICE_FEE_BATCH,
  )
  @IsNotEmpty({ message: '批量支付时 workPriceItemIds 不能为空' })
  @IsArray()
  @ArrayMinSize(1, { message: '工价项ID列表至少包含一个ID' })
  @IsNumber({}, { each: true })
  workPriceItemIds?: number[];

  @IsNotEmpty({ message: '支付金额不能为空' })
  @Type(() => Number)
  @IsNumber({ allowNaN: false }, { message: '支付金额必须是有效数字' })
  @ValidateIf(
    (o) => o.pay_type === WX_PAY_CONFIG.payType.WORK_PRICE_SUB_SERVICE_FEE_BATCH,
  )
  @Min(0, { message: '支付金额不能为负' })
  @ValidateIf(
    (o) => o.pay_type !== WX_PAY_CONFIG.payType.WORK_PRICE_SUB_SERVICE_FEE_BATCH,
  )
  @Min(0.01, { message: '支付金额必须大于0' })
  order_amount: number;
}
