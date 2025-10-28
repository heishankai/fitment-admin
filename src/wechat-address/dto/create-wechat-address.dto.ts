import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateWechatAddressDto {
  @IsString()
  @IsNotEmpty({ message: '业主姓名不能为空' })
  owner_name: string;

  @IsString()
  @IsNotEmpty({ message: '手机号码不能为空' })
  owner_phone: string;

  @IsString()
  @IsNotEmpty({ message: '城市不能为空' })
  city_name: string;

  @IsString()
  @IsNotEmpty({ message: '城市代码不能为空' })
  city_code: string;

  @IsString()
  @IsNotEmpty({ message: '详细地址不能为空' })
  detailed_address: string;

  @IsString()
  @IsNotEmpty({ message: '小区不能为空' })
  community_name: string;

  @IsString()
  @IsNotEmpty({ message: '楼栋房号不能为空' })
  building_number: string;

  @IsBoolean()
  @IsOptional()
  default?: boolean;

  @IsNumber()
  @IsNotEmpty({ message: '微信用户ID不能为空' })
  wechat_user_id: number;
}
