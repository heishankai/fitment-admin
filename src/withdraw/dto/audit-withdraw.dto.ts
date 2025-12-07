import { IsNotEmpty, IsNumber, IsIn } from 'class-validator';

/**
 * 审核提现申请DTO
 */
export class AuditWithdrawDto {
  @IsNotEmpty({ message: '提现申请ID不能为空' })
  @IsNumber()
  withdraw_id: number; // 提现申请ID

  @IsNotEmpty({ message: '状态不能为空' })
  @IsNumber()
  @IsIn([1, 2, 3], { message: '状态必须是 1(已申请)、2(已完成) 或 3(已拒绝)' })
  status: number; // 状态：1已申请，2已完成，3已拒绝
}
