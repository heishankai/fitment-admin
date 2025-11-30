import { IsNumber, IsNotEmpty, IsIn } from 'class-validator';

/**
 * 更新订单状态DTO
 */
export class UpdateOrderStatusDto {
  @IsNotEmpty({ message: '订单状态不能为空' })
  @IsNumber({}, { message: '订单状态必须是数字' })
  @IsIn([1, 2, 3, 4], { message: '订单状态：1=待接单, 2=已接单, 3=已完成, 4=已取消' })
  order_status: number; // 订单状态：1: 待接单, 2: 已接单, 3: 已完成, 4: 已取消
}

