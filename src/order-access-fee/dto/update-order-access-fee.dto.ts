import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderAccessFeeDto } from './create-order-access-fee.dto';

export class UpdateOrderAccessFeeDto extends PartialType(CreateOrderAccessFeeDto) {}
