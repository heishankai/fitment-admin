import {
  IsNotEmpty,
  IsNumber,
} from 'class-validator';

/**
 * 确认辅材支付DTO
 */
export class ConfirmMaterialsPaymentDto {
  @IsNotEmpty({ message: '辅材ID不能为空' })
  @IsNumber()
  materialsId: number; // 辅材ID
}
