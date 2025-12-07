import { IsNumber, IsNotEmpty, IsString, IsIn, IsOptional, ValidateIf, Min } from 'class-validator';

/**
 * 确认支付DTO
 */
export class ConfirmPaymentDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsNumber({}, { message: '订单ID必须是数字' })
  order_id: number; // 订单ID

  @IsNotEmpty({ message: '支付类型不能为空' })
  @IsString({ message: '支付类型必须是字符串' })
  @IsIn(['work_prices', 'sub_work_prices', 'materials_list'], { message: '支付类型必须是 work_prices、sub_work_prices 或 materials_list' })
  pay_type: string; // 支付类型：work_prices、sub_work_prices 或 materials_list

  /**
   * 子工价索引（当 pay_type 为 sub_work_prices 时必填）
   * 辅材索引（当 pay_type 为 materials_list 时必填）
   */
  @ValidateIf((o) => o.pay_type === 'sub_work_prices' || o.pay_type === 'materials_list')
  @IsNotEmpty({ message: '索引不能为空' })
  @IsNumber({}, { message: '索引必须是数字' })
  @Min(0, { message: '索引不能小于0' })
  subItem?: number; // 子工价索引或辅材索引
}

