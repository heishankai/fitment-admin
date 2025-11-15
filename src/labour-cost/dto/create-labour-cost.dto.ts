import {
  IsString,
  IsNotEmpty,
} from 'class-validator';

export class CreateLabourCostDto {
  @IsString()
  @IsNotEmpty({ message: '人工成本名称不能为空' })
  labour_cost_name: string; // 人工成本名称
}

