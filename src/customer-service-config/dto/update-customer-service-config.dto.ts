import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCustomerServiceConfigDto {
  @IsOptional()
  @IsString({ message: '客服头像必须是字符串' })
  avatar?: string;

  @IsOptional()
  @IsString({ message: '欢迎语必须是字符串' })
  @MaxLength(500, { message: '欢迎语长度不能超过500个字符' })
  welcome_text?: string;

  @IsOptional()
  @IsString({ message: '欢迎图片必须是字符串' })
  welcome_image?: string;
}
