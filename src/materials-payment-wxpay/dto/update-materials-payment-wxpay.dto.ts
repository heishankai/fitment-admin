import { PartialType } from '@nestjs/mapped-types';
import { CreateMaterialsPaymentWxpayDto } from './create-materials-payment-wxpay.dto';

export class UpdateMaterialsPaymentWxpayDto extends PartialType(CreateMaterialsPaymentWxpayDto) {}
