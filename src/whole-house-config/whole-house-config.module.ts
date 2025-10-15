import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WholeHouseConfig } from './whole-house-config.entity';
import { WholeHouseConfigController } from './whole-house-config.controller';
import { WholeHouseConfigService } from './whole-house-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([WholeHouseConfig])],
  controllers: [WholeHouseConfigController],
  providers: [WholeHouseConfigService],
  exports: [WholeHouseConfigService],
})
export class WholeHouseConfigModule {}
