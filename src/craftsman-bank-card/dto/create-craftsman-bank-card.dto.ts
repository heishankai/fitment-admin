import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * 创建银行卡信息DTO
 */
export class CreateCraftsmanBankCardDto {
  @IsNotEmpty({ message: '银行名称不能为空' })
  @IsString()
  @MaxLength(100, { message: '银行名称长度不能超过100个字符' })
  bank_name: string; // 银行名称

  @IsNotEmpty({ message: '银行卡号不能为空' })
  @IsString()
  @MaxLength(50, { message: '银行卡号长度不能超过50个字符' })
  card_number: string; // 银行卡号

  @IsString()
  @MaxLength(200, { message: '开户行长度不能超过200个字符' })
  bank_branch?: string; // 开户行（可选）

  @IsNotEmpty({ message: '姓名不能为空' })
  @IsString()
  @MaxLength(50, { message: '姓名长度不能超过50个字符' })
  name: string; // 姓名

  @IsNotEmpty({ message: '手机号不能为空' })
  @IsString()
  @MaxLength(20, { message: '手机号长度不能超过20个字符' })
  phone: string; // 手机号
}
