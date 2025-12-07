import { IsNotEmpty, IsNumber, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { WalletTransactionType } from '../wallet-transaction.entity';

/**
 * 创建账户明细DTO
 */
export class CreateWalletTransactionDto {
  @IsNotEmpty({ message: '用户ID不能为空' })
  @IsNumber()
  craftsman_user_id: number;

  @IsNotEmpty({ message: '金额不能为空' })
  @IsNumber()
  @Min(0.01, { message: '金额必须大于0' })
  amount: number;

  @IsNotEmpty({ message: '类型不能为空' })
  @IsEnum(WalletTransactionType, { message: '类型必须是1（收入）或2（支出）' })
  type: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  order_id?: string;
}
