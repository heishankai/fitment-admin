import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Materials } from './materials.entity';
import { Order } from '../order/order.entity';
import { MaterialsService } from './materials.service';
import { MaterialsController } from './materials.controller';
import { PlatformIncomeRecordModule } from '../platform-income-record/platform-income-record.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Materials, Order]),
    PlatformIncomeRecordModule,
  ],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
