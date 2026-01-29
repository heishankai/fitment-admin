import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialsPaymentWxpayService } from './materials-payment-wxpay.service';
import { MaterialsPaymentWxpayController } from './materials-payment-wxpay.controller';
import { MaterialsPaymentWxpay } from './entities/materials-payment-wxpay.entity';
import { WxPayModule } from '../common/wx-pay/wx-pay.module';
import { Materials } from '../materials/materials.entity';
import { WechatUser } from '../wechat-user/wechat-user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MaterialsPaymentWxpay, Materials, WechatUser]),
    WxPayModule,
  ],
  controllers: [MaterialsPaymentWxpayController],
  providers: [MaterialsPaymentWxpayService],
  exports: [MaterialsPaymentWxpayService],
})
export class MaterialsPaymentWxpayModule {}
