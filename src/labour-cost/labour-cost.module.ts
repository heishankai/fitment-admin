import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabourCostService } from './labour-cost.service';
import { LabourCostController } from './labour-cost.controller';
import { LabourCost } from './labour-cost.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LabourCost])],
  controllers: [LabourCostController],
  providers: [LabourCostService],
  exports: [LabourCostService],
})
export class LabourCostModule {}

