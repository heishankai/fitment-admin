import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderPaymentWxpayDto } from './create-order-payment-wxpay.dto';

export class UpdateOrderPaymentWxpayDto extends PartialType(CreateOrderPaymentWxpayDto) {}
