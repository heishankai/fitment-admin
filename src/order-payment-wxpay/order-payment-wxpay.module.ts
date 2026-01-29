import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderPaymentWxpayService } from './order-payment-wxpay.service';
import { OrderPaymentWxpayController } from './order-payment-wxpay.controller';
import { OrderPaymentWxpay } from './entities/order-payment-wxpay.entity';
import { WxPayModule } from '../common/wx-pay/wx-pay.module';
import { WechatUser } from '../wechat-user/wechat-user.entity';
import { WorkPriceItem } from '../work-price-item/work-price-item.entity';
import { Order } from '../order/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderPaymentWxpay,
      WechatUser,
      WorkPriceItem,
      Order,
    ]),
    WxPayModule,
  ],

  controllers: [OrderPaymentWxpayController],
  providers: [OrderPaymentWxpayService],
})
export class OrderPaymentWxpayModule {}
