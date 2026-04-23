import { Type } from 'class-transformer';
import {
  IsArray,
  IsString,
  Matches,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';

export class SmsNotifyPhoneItemDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;
}

export class UpdateSmsNotifyConfigDto {
  @IsArray()
  @ArrayMaxSize(20, { message: '最多配置 20 个号码' })
  @ValidateNested({ each: true })
  @Type(() => SmsNotifyPhoneItemDto)
  phones: SmsNotifyPhoneItemDto[];
}
