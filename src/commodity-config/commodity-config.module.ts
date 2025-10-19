import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommodityConfigService } from './commodity-config.service';
import { CommodityConfigController } from './commodity-config.controller';
import { CommodityConfig } from './commodity-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CommodityConfig])],
  controllers: [CommodityConfigController],
  providers: [CommodityConfigService],
  exports: [CommodityConfigService],
})
export class CommodityConfigModule {}
