import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerServiceConfigController } from './customer-service-config.controller';
import { CustomerServiceConfig } from './customer-service-config.entity';
import { CustomerServiceConfigService } from './customer-service-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerServiceConfig])],
  controllers: [CustomerServiceConfigController],
  providers: [CustomerServiceConfigService],
  exports: [CustomerServiceConfigService],
})
export class CustomerServiceConfigModule {}
