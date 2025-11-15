import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsNotEmpty,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class ServiceDetailDto {
  @IsString()
  @IsOptional()
  service_title?: string;

  @IsString()
  @IsOptional()
  service_desc?: string;

  @IsArray({ message: '服务图片必须是数组' })
  @IsNotEmpty({ message: '服务图片不能为空' })
  @ArrayMinSize(1, { message: '服务图片至少需要1张' })
  @IsString({ each: true, message: '服务图片必须是字符串数组' })
  service_image: string[];
}

class WorkKindDto {
  @IsString()
  @IsNotEmpty({ message: '工种标签不能为空' })
  label: string;

  @IsNotEmpty({ message: '工种值不能为空' })
  value: string | number;
}

class LabourCostDto {
  @IsString()
  @IsNotEmpty({ message: '人工成本标签不能为空' })
  label: string;

  @IsNotEmpty({ message: '人工成本值不能为空' })
  value: string | number;
}

export class CreateWorkTypeDto {
  // 工种名称
  @IsString()
  @IsNotEmpty({ message: '工种名称不能为空' })
  work_title: string;

  // 工种价格
  @IsNotEmpty({ message: '工种价格不能为空' })
  work_price: any;

  // 计价说明
  @IsString()
  @IsOptional()
  pricing_description?: string;

  // 服务范围
  @IsString()
  @IsOptional()
  service_scope?: string;

  // 展示图片
  @IsArray()
  @IsOptional()
  display_images?: string[];

  // 服务详情
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ServiceDetailDto)
  service_details?: ServiceDetailDto[];

  // 工种
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkKindDto)
  work_kind?: WorkKindDto;

  // 人工成本
  @IsOptional()
  @ValidateNested()
  @Type(() => LabourCostDto)
  labour_cost?: LabourCostDto;
}
