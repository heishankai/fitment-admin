import {
  IsNotEmpty,
  IsNumber,
} from 'class-validator';

/**
 * 验收辅材DTO
 */
export class AcceptMaterialsDto {
  @IsNotEmpty({ message: '辅材ID不能为空' })
  @IsNumber()
  materialsId: number; // 辅材ID
}
