import { Module, forwardRef } from '@nestjs/common';
import { WxPayService } from './wx-pay.service';
import { WxPayController } from './wx-pay.controller';
import { MaterialsModule } from '../materials/materials.module';
import { WorkPriceItemModule } from '../work-price-item/work-price-item.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    forwardRef(() => MaterialsModule),
    forwardRef(() => WorkPriceItemModule),
    forwardRef(() => OrderModule),
  ],
  controllers: [WxPayController],
  providers: [WxPayService],
  exports: [WxPayService],
})
export class WxPayModule {}

