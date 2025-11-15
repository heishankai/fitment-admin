import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class SendSmsCodeDto {
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string; // 手机号码
}
