import { IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CustomerCommentDto {
  @IsString()
  @IsOptional()
  comment_desc?: string;

  @IsArray()
  @IsOptional()
  comment_images?: string[];
}

/**
 * 更新工匠查询DTO
 */
export class UpdateCraftsmanQueryDto {
  /**
   * 工匠名称
   */
  @IsOptional()
  @IsString({ message: '工匠名称必须是字符串' })
  craftsman_name?: string;

  /**
   * 年龄
   */
  @IsOptional()
  craftsman_age?: any;

  /**
   * 手机号码
   */
  @IsOptional()
  craftsman_phone?: any;

  /**
   * 城市名称
   */
  @IsOptional()
  @IsString({ message: '城市名称必须是字符串' })
  city_name?: string;

  /**
   * 城市代码
   */
  @IsOptional()
  @IsString({ message: '城市代码必须是字符串' })
  city_code?: string;

  /**
   * 技能
   */
  @IsOptional()
  @IsString({ message: '技能必须是字符串' })
  craftsman_skill?: string;

  /**
   * 个人简介
   */
  @IsOptional()
  @IsString({ message: '个人简介必须是字符串' })
  craftsman_intro?: string;

  /**
   * 个人荣誉说明
   */
  @IsOptional()
  @IsString({ message: '个人荣誉说明必须是字符串' })
  craftsman_honor?: string;

  /**
   * 过往工作说明
   */
  @IsOptional()
  @IsString({ message: '过往工作说明必须是字符串' })
  craftsman_work_intro?: string;

  /**
   * 形象照
   */
  @IsOptional()
  @IsArray({ message: '形象照必须是数组' })
  craftsman_image?: string[];

  /**
   * 个人荣誉照片
   */
  @IsOptional()
  @IsArray({ message: '个人荣誉照片必须是数组' })
  craftsman_honor_images?: string[];

  /**
   * 技能证书
   */
  @IsOptional()
  @IsArray({ message: '技能证书必须是数组' })
  craftsman_skill_certificate?: string[];

  /**
   * 客户好评说明
   */
  @IsOptional()
  @IsArray({ message: '客户好评说明必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => CustomerCommentDto)
  craftsman_customer_comments?: CustomerCommentDto[];
}
