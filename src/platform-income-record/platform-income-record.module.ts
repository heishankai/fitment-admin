import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformIncomeRecord } from './platform-income-record.entity';
import { Order } from '../order/order.entity';
import { PlatformIncomeRecordService } from './platform-income-record.service';
import { PlatformIncomeRecordController } from './platform-income-record.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformIncomeRecord, Order]),
  ],
  controllers: [PlatformIncomeRecordController],
  providers: [PlatformIncomeRecordService],
  exports: [PlatformIncomeRecordService],
})
export class PlatformIncomeRecordModule {}
