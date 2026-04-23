import { IsString, IsNotEmpty } from 'class-validator';

/** 微信小程序 getPhoneNumber 返回的 code（与登录 code 不同） */
export class CraftGetPhoneDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
