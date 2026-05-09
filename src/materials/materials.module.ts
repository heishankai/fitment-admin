import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Materials } from './materials.entity';
import { Order } from '../order/order.entity';
import { WorkPriceItem } from '../work-price-item/work-price-item.entity';
import { MaterialsService } from './materials.service';
import { MaterialsController } from './materials.controller';
import { PlatformIncomeRecordModule } from '../platform-income-record/platform-income-record.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Materials, Order, WorkPriceItem]),
    PlatformIncomeRecordModule,
    forwardRef(() => OrderModule),
  ],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
