import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkKindService } from './work-kind.service';
import { WorkKindController } from './work-kind.controller';
import { WorkKind } from './work-kind.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorkKind])],
  controllers: [WorkKindController],
  providers: [WorkKindService],
  exports: [WorkKindService],
})
export class WorkKindModule {}

