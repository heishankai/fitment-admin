import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartialRenovationConfig } from './partial-renovation-config.entity';
import { PartialRenovationConfigController } from './partial-renovation-config.controller';
import { PartialRenovationConfigService } from './partial-renovation-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([PartialRenovationConfig])],
  controllers: [PartialRenovationConfigController],
  providers: [PartialRenovationConfigService],
  exports: [PartialRenovationConfigService],
})
export class PartialRenovationConfigModule {}
