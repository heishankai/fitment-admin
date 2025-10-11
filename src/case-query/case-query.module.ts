import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CaseQueryService } from './case-query.service';
import { CaseQueryController } from './case-query.controller';
import { CaseQuery } from './case-query.entity';
@Module({
  imports: [TypeOrmModule.forFeature([CaseQuery])],
  controllers: [CaseQueryController],
  providers: [CaseQueryService],
  exports: [CaseQueryService],
})
export class CaseQueryModule {}
