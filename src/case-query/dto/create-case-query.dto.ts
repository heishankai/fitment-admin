import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

export class CreateCaseQueryDto {
  // 小区名称
  @IsString()
  @IsNotEmpty({ message: '小区名称不能为空' })
  housing_name: string;

  // 户型
  @IsString()
  @IsNotEmpty({ message: '户型不能为空' })
  housing_type: string;

  // 改造类型 : 1 新房装修 2 旧房改造
  @IsNumber()
  @IsNotEmpty({ message: '改造类型不能为空' })
  remodel_type: number;

  // 城市名称
  @IsString()
  @IsNotEmpty({ message: '城市不能为空' })
  city_name: string;

  // 城市code
  @IsString()
  @IsNotEmpty({ message: '城市不能为空' })
  city_code: string;

  // 平米数
  @IsNumber()
  @IsNotEmpty({ message: '平米数不能为空' })
  square_number: number;

  // 施工费用
  @IsNumber()
  @IsNotEmpty({ message: '施工费用不能为空' })
  construction_cost: number;

  // 辅材费用
  @IsNumber()
  @IsNotEmpty({ message: '辅材费用不能为空' })
  auxiliary_material_cost: number;

  // 施工现场图
  @IsArray()
  @IsOptional()
  construction_image?: string[];

  // 客厅及走廊
  @IsArray()
  @IsOptional()
  drawingroom_image?: string[];

  // 阳台
  @IsArray()
  @IsOptional()
  balcony_image?: string[];

  // 主卧
  @IsArray()
  @IsOptional()
  master_bedroom_image?: string[];

  // 次卧
  @IsArray()
  @IsOptional()
  secondary_bedroom_image?: string[];

  // 卫生间
  @IsArray()
  @IsOptional()
  bathroom_image?: string[];

  // 厨房
  @IsArray()
  @IsOptional()
  kitchen_image?: string[];
}
