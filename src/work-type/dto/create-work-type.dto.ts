import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsNotEmpty,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ServiceDetailDto {
  @IsString()
  @IsOptional()
  service_desc?: string;

  @IsString()
  @IsNotEmpty({ message: '服务图片不能为空' })
  service_image: string;
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
}
