import {
  IsNotEmpty,
  IsNumber,
  Min,
} from 'class-validator';

/**
 * 申请提现DTO
 */
export class CreateWithdrawDto {
  @IsNotEmpty({ message: '提现金额不能为空' })
  @IsNumber()
  @Min(0.01, { message: '提现金额必须大于0' })
  amount: number; // 提现金额
}
