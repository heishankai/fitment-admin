import { Module } from '@nestjs/common';
import { WxPayService } from './wx-pay.service';
import { WxPayController } from './wx-pay.controller';

@Module({
  controllers: [WxPayController],
  providers: [WxPayService],
  exports: [WxPayService],
})
export class WxPayModule {}
