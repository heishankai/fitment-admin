import { IsString, IsOptional, IsIn } from 'class-validator';

/**
 * 更新获取报价DTO
 */
export class UpdateGetPriceDto {
  /**
   * 面积
   */
  @IsOptional()
  @IsString({ message: '面积必须是字符串' })
  area?: string;

  /**
   * 房屋类型：new（新房）或 old（老房）
   */
  @IsOptional()
  @IsString({ message: '房屋类型必须是字符串' })
  @IsIn(['new', 'old'], { message: '房屋类型必须是 new 或 old' })
  houseType?: string;

  /**
   * 房屋类型名称：新房 或 老房
   */
  @IsOptional()
  @IsString({ message: '房屋类型名称必须是字符串' })
  @IsIn(['新房', '老房'], { message: '房屋类型名称必须是 新房 或 老房' })
  houseTypeName?: string;

  /**
   * 位置（详细地址）
   */
  @IsOptional()
  @IsString({ message: '位置必须是字符串' })
  location?: string;

  /**
   * 户型（如：3居室）
   */
  @IsOptional()
  @IsString({ message: '户型必须是字符串' })
  roomType?: string;

  /**
   * 手机号
   */
  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  phone?: string;
}

