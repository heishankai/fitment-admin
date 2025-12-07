import { IsNumber, IsNotEmpty } from 'class-validator';

/**
 * 指派订单DTO
 */
export class AssignOrderDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsNumber({}, { message: '订单ID必须是数字' })
  orderId: number; // 订单ID

  @IsNotEmpty({ message: '工匠用户ID不能为空' })
  @IsNumber({}, { message: '工匠用户ID必须是数字' })
  craftsmanUserId: number; // 工匠用户ID
}

