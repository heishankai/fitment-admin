import {
  IsString,
  IsNotEmpty,
} from 'class-validator';

export class CreateWorkKindDto {
  @IsString()
  @IsNotEmpty({ message: '工种名称不能为空' })
  work_kind_name: string; // 工种名称
}

