import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkTypeService } from './work-type.service';
import { WorkTypeController } from './work-type.controller';
import { WorkType } from './work-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorkType])],
  controllers: [WorkTypeController],
  providers: [WorkTypeService],
  exports: [WorkTypeService],
})
export class WorkTypeModule {}
