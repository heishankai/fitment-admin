import {
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsString,
  IsOptional,
  Min,
} from 'class-validator';
import { CostType } from '../platform-income-record.entity';

/**
 * 创建平台收支记录DTO
 */
export class CreatePlatformIncomeRecordDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsNumber()
  orderId: number; // 订单ID

  @IsOptional()
  @IsString()
  order_no?: string; // 订单编号（可选，如果不提供会从订单中获取）

  @IsNotEmpty({ message: '费用类型不能为空' })
  @IsEnum(CostType, { message: '费用类型必须是 materials 或 service_fee' })
  cost_type: CostType; // 费用类型：'materials' | 'service_fee'

  @IsNotEmpty({ message: '费用金额不能为空' })
  @IsNumber()
  @Min(0, { message: '费用金额不能小于0' })
  cost_amount: number; // 费用金额
}
