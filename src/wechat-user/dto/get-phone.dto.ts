import { IsString, IsNotEmpty } from 'class-validator';

export class GetPhoneDto {
  @IsString()
  @IsNotEmpty()
  code: string; // 微信小程序获取手机号码的code

  @IsString()
  @IsNotEmpty()
  openid: string; // 用户openid
}
