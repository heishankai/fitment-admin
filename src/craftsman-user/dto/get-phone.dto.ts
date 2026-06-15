import { IsNotEmpty, IsString } from 'class-validator';

export class GetPhoneDto {
  @IsString()
  @IsNotEmpty({ message: '手机号授权code不能为空' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'openid不能为空' })
  openid: string;
}
