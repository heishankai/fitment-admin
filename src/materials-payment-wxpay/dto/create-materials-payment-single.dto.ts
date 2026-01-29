import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateMaterialsPaymentSingleDto {
  @IsNotEmpty({ message: '辅材ID不能为空' })
  @IsNumber()
  materialsId: number;
}
