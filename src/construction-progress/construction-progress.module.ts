import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConstructionProgress } from './construction-progress.entity';
import { Order } from '../order/order.entity';
import { WorkPriceItem } from '../work-price-item/work-price-item.entity';
import { ConstructionProgressService } from './construction-progress.service';
import { ConstructionProgressController } from './construction-progress.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConstructionProgress, Order, WorkPriceItem]),
  ],
  controllers: [ConstructionProgressController],
  providers: [ConstructionProgressService],
  exports: [ConstructionProgressService],
})
export class ConstructionProgressModule {}
