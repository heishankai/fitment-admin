import { IsOptional, IsNumber, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { WalletTransactionType } from '../wallet-transaction.entity';

/**
 * 查询账户明细DTO
 */
export class QueryWalletTransactionDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  craftsman_user_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsEnum(WalletTransactionType)
  type?: number; // 类型：1收入，2支出

  @IsOptional()
  @IsString()
  order_id?: string; // 关联订单ID
}
