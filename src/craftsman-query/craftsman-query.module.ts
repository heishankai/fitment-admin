import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CraftsmanQueryService } from './craftsman-query.service';
import { CraftsmanQueryController } from './craftsman-query.controller';
import { CraftsmanQuery } from './craftsman-query.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CraftsmanQuery])],
  controllers: [CraftsmanQueryController],
  providers: [CraftsmanQueryService],
  exports: [CraftsmanQueryService],
})
export class CraftsmanQueryModule {}
