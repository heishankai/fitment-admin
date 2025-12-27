import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

/**
 * 创建获取报价DTO
 */
export class CreateGetPriceDto {
  /**
   * 面积
   */
  @IsString({ message: '面积必须是字符串' })
  @IsNotEmpty({ message: '面积不能为空' })
  area: string;

  /**
   * 房屋类型：new（新房）或 old（老房）
   */
  @IsString({ message: '房屋类型必须是字符串' })
  @IsNotEmpty({ message: '房屋类型不能为空' })
  @IsIn(['new', 'old'], { message: '房屋类型必须是 new 或 old' })
  houseType: string;

  /**
   * 房屋类型名称：新房 或 老房（可选，如果不提供会根据 houseType 自动生成）
   */
  @IsOptional()
  @IsString({ message: '房屋类型名称必须是字符串' })
  @IsIn(['新房', '老房'], { message: '房屋类型名称必须是 新房 或 老房' })
  houseTypeName?: string;

  /**
   * 位置（详细地址）
   */
  @IsString({ message: '位置必须是字符串' })
  @IsNotEmpty({ message: '位置不能为空' })
  location: string;

  /**
   * 户型（如：3居室）
   */
  @IsString({ message: '户型必须是字符串' })
  @IsNotEmpty({ message: '户型不能为空' })
  roomType: string;

  /**
   * 手机号
   */
  @IsString({ message: '手机号必须是字符串' })
  @IsNotEmpty({ message: '手机号不能为空' })
  phone: string;
}

