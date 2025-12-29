import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkPriceItem } from './work-price-item.entity';
import { Order } from '../order/order.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';
import { Materials } from '../materials/materials.entity';
import { WorkPriceItemService } from './work-price-item.service';
import { WorkPriceItemController } from './work-price-item.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkPriceItem, Order, CraftsmanUser, Materials]),
  ],
  controllers: [WorkPriceItemController],
  providers: [WorkPriceItemService],
  exports: [WorkPriceItemService],
})
export class WorkPriceItemModule {}

