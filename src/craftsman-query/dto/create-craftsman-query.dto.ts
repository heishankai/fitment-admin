import {
  IsString,
  IsArray,
  IsOptional,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CustomerCommentDto {
  @IsString()
  @IsNotEmpty({ message: '客户评价描述不能为空' })
  comment_desc: string;

  @IsArray()
  @IsOptional()
  comment_images?: string[];
}

export class CreateCraftsmanQueryDto {
  // 工匠名称
  @IsString()
  @IsNotEmpty({ message: '工匠名称不能为空' })
  craftsman_name: string;

  // 年龄
  @IsNotEmpty({ message: '年龄不能为空' })
  craftsman_age: any;

  // 手机号码
  @IsNotEmpty({ message: '手机号码不能为空' })
  craftsman_phone: any;

  // 城市名称
  @IsString()
  @IsNotEmpty({ message: '城市名称不能为空' })
  city_name: string;

  // 城市代码
  @IsString()
  @IsNotEmpty({ message: '城市代码不能为空' })
  city_code: string;

  // 技能
  @IsString()
  @IsOptional()
  craftsman_skill?: string;

  // 个人简介
  @IsString()
  @IsOptional()
  craftsman_intro?: string;

  // 个人荣誉说明
  @IsString()
  @IsOptional()
  craftsman_honor?: string;

  // 过往工作说明
  @IsString()
  @IsOptional()
  craftsman_work_intro?: string;

  // 形象照
  @IsArray()
  @IsOptional()
  craftsman_image?: string[];

  // 个人荣誉照片
  @IsArray()
  @IsOptional()
  craftsman_honor_images?: string[];

  // 技能证书
  @IsArray()
  @IsOptional()
  craftsman_skill_certificate?: string[];

  // 客户好评说明
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CustomerCommentDto)
  craftsman_customer_comments?: CustomerCommentDto[];
}
