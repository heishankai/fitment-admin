import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

/**
 * 创建平台收支记录DTO
 */
export class CreatePlatformIncomeRecordDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsNumber()
  orderId: number; // 订单ID

  @IsOptional()
  @IsNumber()
  @Min(0, { message: '辅材费用不能小于0' })
  materials_cost?: number; // 订单的辅材费用，默认是0

  @IsOptional()
  @IsNumber()
  @Min(0, { message: '服务费不能小于0' })
  total_service_fee?: number; // 订单收取的服务费，默认是0
}
