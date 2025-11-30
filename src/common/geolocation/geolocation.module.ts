import { Module } from '@nestjs/common';
import { GeolocationController } from './geolocation.controller';
import { GeolocationService } from '../services/geolocation.service';

@Module({
  controllers: [GeolocationController],
  providers: [GeolocationService],
  exports: [GeolocationService], // 导出服务供其他模块使用
})
export class GeolocationModule {}
