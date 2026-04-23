import { IsString, IsNotEmpty } from 'class-validator';

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
   * 房屋类型（字符串）
   */
  @IsString({ message: '房屋类型必须是字符串' })
  @IsNotEmpty({ message: '房屋类型不能为空' })
  houseType: string;

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

