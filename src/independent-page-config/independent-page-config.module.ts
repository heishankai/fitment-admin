import { Module } from '@nestjs/common';
import { IndependentPageConfigService } from './independent-page-config.service';
import { IndependentPageConfigController } from './independent-page-config.controller';

import { TypeOrmModule } from '@nestjs/typeorm';
import { IndependentPageConfig } from './entities/independent-page-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IndependentPageConfig])],
  controllers: [IndependentPageConfigController],
  providers: [IndependentPageConfigService],
  exports: [IndependentPageConfigService],
})
export class IndependentPageConfigModule {}
