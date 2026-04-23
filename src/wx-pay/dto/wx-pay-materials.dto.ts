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

const MATERIAL_PAY_TYPES = [
  WX_PAY_CONFIG.payType.MATERIAL_SINGLE,
  WX_PAY_CONFIG.payType.MATERIAL_BATCH,
] as const;

/**
 * 辅材微信支付DTO
 * 仅通过 materialId（单个）或 materialsIds（批量）操作，orderId 由后端从辅材记录推导
 */
export class WxPayMaterialsDto {
  @IsNotEmpty({ message: '支付类型不能为空' })
  @IsIn(MATERIAL_PAY_TYPES, {
    message: `支付类型必须是 ${MATERIAL_PAY_TYPES.join(' 或 ')}`,
  })
  pay_type: (typeof MATERIAL_PAY_TYPES)[number];

  /** 单个支付时必填 */
  @ValidateIf((o) => o.pay_type === WX_PAY_CONFIG.payType.MATERIAL_SINGLE)
  @IsNotEmpty({ message: '单个支付时 materialId 不能为空' })
  @Type(() => Number)
  @IsNumber()
  materialId?: number;

  /** 批量支付时必填 */
  @ValidateIf((o) => o.pay_type === WX_PAY_CONFIG.payType.MATERIAL_BATCH)
  @IsNotEmpty({ message: '批量支付时 materialsIds 不能为空' })
  @IsArray()
  @ArrayMinSize(1, { message: '辅材ID列表至少包含一个ID' })
  @IsNumber({}, { each: true })
  materialsIds?: number[];

  @IsNotEmpty({ message: '支付金额不能为空' })
  @Type(() => Number)
  @IsNumber({ allowNaN: false }, { message: '支付金额必须是有效数字' })
  @Min(0.01, { message: '支付金额必须大于0' })
  order_amount: number; // 支付金额（元），前端传入
  // openid 由后端从当前登录用户自动获取
}
