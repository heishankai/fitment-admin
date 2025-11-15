import { IsOptional, IsString, IsNumber, IsArray, Min, ValidateNested, IsNotEmpty, ArrayMinSize } from 'class-validator';
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
  @IsOptional()
  label?: string;

  @IsOptional()
  value?: string | number;
}

class LabourCostDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsOptional()
  value?: string | number;
}

/**
 * 更新工种类型DTO
 */
export class UpdateWorkTypeDto {
  /**
   * 工种名称
   */
  @IsOptional()
  @IsString({ message: '工种名称必须是字符串' })
  work_title?: string;

  /**
   * 工种价格
   */
  @IsOptional()
  work_price?: any;

  /**
   * 计价说明
   */
  @IsOptional()
  @IsString({ message: '计价说明必须是字符串' })
  pricing_description?: string;

  /**
   * 服务范围
   */
  @IsOptional()
  @IsString({ message: '服务范围必须是字符串' })
  service_scope?: string;

  /**
   * 展示图片
   */
  @IsOptional()
  @IsArray({ message: '展示图片必须是数组' })
  display_images?: string[];

  /**
   * 服务详情
   */
  @IsOptional()
  @IsArray({ message: '服务详情必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => ServiceDetailDto)
  service_details?: ServiceDetailDto[];

  /**
   * 工种
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkKindDto)
  work_kind?: WorkKindDto;

  /**
   * 人工成本
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => LabourCostDto)
  labour_cost?: LabourCostDto;
}
