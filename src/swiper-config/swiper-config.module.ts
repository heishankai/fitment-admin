import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SwiperConfigService } from './swiper-config.service';
import { SwiperConfigController } from './swiper-config.controller';
import { SwiperConfig } from './swiper-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SwiperConfig])],
  controllers: [SwiperConfigController],
  providers: [SwiperConfigService],
  exports: [SwiperConfigService],
})
export class SwiperConfigModule {}
