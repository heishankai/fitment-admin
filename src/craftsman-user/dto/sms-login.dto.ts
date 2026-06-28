import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SmsLoginDto {
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: '验证码不能为空' })
  @Matches(/^\d{4,6}$/, { message: '验证码格式不正确' })
  code: string;
}
