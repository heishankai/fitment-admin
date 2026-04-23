import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderWxPayDto {
  @IsNotEmpty({ message: '订单编号不能为空' })
  @IsString({ message: '订单编号必须是字符串' })
  order_no: string; // 订单编号

  @IsNotEmpty({ message: '订单金额不能为空' })
  @Type(() => Number)
  @IsNumber({ allowNaN: false }, { message: '订单金额必须是有效数字' })
  order_amount: number; // 订单金额（元）
  // openid 由后端从当前登录用户自动获取
}
  
  