import {
  IsString,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';

/**
 * 管理员创建订单DTO（可分配工长和工匠）
 */
export class CreateOrderAdminDto {
  @IsNotEmpty({ message: '面积不能为空' })
  @IsNumber({}, { message: '面积必须是数字' })
  area: number; // 面积

  @IsNotEmpty({ message: '房屋类型不能为空' })
  @IsString({ message: '房屋类型必须是字符串' })
  houseType: string; // 房屋类型：new/old

  @IsNotEmpty({ message: '户型不能为空' })
  @IsString({ message: '户型必须是字符串' })
  roomType: string; // 户型：如"2居室"

  @IsNotEmpty({ message: '详细地址不能为空' })
  @IsString({ message: '详细地址必须是字符串' })
  location: string; // 详细地址

  @IsNotEmpty({ message: '工匠用户ID不能为空' })
  @IsNumber({}, { message: '工匠用户ID必须是数字' })
  craftsman_user_id: number; // 工匠用户ID（用于判断是工长单还是工匠单）

  @IsNotEmpty({ message: '微信用户ID不能为空' })
  @IsNumber({}, { message: '微信用户ID必须是数字' })
  wechat_user_id: number; // 微信用户ID
}

