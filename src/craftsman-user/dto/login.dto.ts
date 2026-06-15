import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: '微信登录code不能为空' })
  code: string; // wx.login 返回的临时登录凭证
}
