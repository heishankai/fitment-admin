import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentRecord } from './payment-record.entity';
import { PaymentRecordService } from './payment-record.service';
import { PaymentRecordController } from './payment-record.controller';
import { Order } from '../order/order.entity';
import { WechatUser } from '../wechat-user/wechat-user.entity';
import { Materials } from '../materials/materials.entity';
import { WorkPriceItem } from '../work-price-item/work-price-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentRecord,
      Order,
      WechatUser,
      Materials,
      WorkPriceItem,
    ]),
  ],
  controllers: [PaymentRecordController],
  providers: [PaymentRecordService],
  exports: [PaymentRecordService],
})
export class PaymentRecordModule {}
