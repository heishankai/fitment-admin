import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateMaterialsPaymentBatchDto {
  @IsNotEmpty({ message: '辅材ID列表不能为空' })
  @IsArray({ message: '辅材ID列表必须是数组' })
  @ArrayMinSize(1, { message: '辅材ID列表至少包含一个ID' })
  @IsNumber({}, { each: true, message: '辅材ID必须是数字' })
  materialsIds: number[];
}
