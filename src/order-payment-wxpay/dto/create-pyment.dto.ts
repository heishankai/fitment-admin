import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty({ message: '工价项ID不能为空' })
  @IsNumber()
  work_price_item_id: number;
}
