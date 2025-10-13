import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';

/**
 * 更新案例查询记录DTO
 */
export class UpdateCaseQueryDto {
  /**
   * 小区名称
   */
  @IsOptional()
  @IsString({ message: '小区名称必须是字符串' })
  housing_name?: string;

  /**
   * 改造类型 : 1 新房装修 2 旧房改造
   */
  @IsOptional()
  @IsNumber({}, { message: '改造类型必须是数字' })
  remodel_type?: number;

  /**
   * 城市
   */
  @IsOptional()
  @IsString({ message: '城市必须是字符串' })
  city_name?: string;

  /**
   * 户型
   */
  @IsOptional()
  @IsString({ message: '户型必须是字符串' })
  housing_type?: string;

  /**
   * 城市代码
   */
  @IsOptional()
  @IsString({ message: '城市代码必须是字符串' })
  city_code?: string;

  /**
   * 平米数
   */
  @IsOptional()
  @IsNumber({}, { message: '平米数必须是数字' })
  square_number?: number;

  /**
   * 施工费用
   */
  @IsOptional()
  @IsNumber({}, { message: '施工费用必须是数字' })
  construction_cost?: number;

  /**
   * 辅材费用
   */
  @IsOptional()
  @IsNumber({}, { message: '辅材费用必须是数字' })
  auxiliary_material_cost?: number;

  /**
   * 施工现场图
   */
  @IsOptional()
  @IsArray({ message: '施工现场图必须是数组' })
  construction_image?: string[];

  /**
   * 客厅及走廊
   */
  @IsOptional()
  @IsArray({ message: '客厅及走廊图片必须是数组' })
  drawingroom_image?: string[];

  /**
   * 阳台
   */
  @IsOptional()
  @IsArray({ message: '阳台图片必须是数组' })
  balcony_image?: string[];

  /**
   * 主卧
   */
  @IsOptional()
  @IsArray({ message: '主卧图片必须是数组' })
  master_bedroom_image?: string[];

  /**
   * 次卧
   */
  @IsOptional()
  @IsArray({ message: '次卧图片必须是数组' })
  secondary_bedroom_image?: string[];

  /**
   * 卫生间
   */
  @IsOptional()
  @IsArray({ message: '卫生间图片必须是数组' })
  bathroom_image?: string[];
}
