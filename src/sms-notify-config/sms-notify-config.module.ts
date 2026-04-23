import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsNotifyConfig } from 'src/sms-notify-config/sms-notify-config.entity';
import { Order } from 'src/order/order.entity';
import { SmsNotifyConfigService } from 'src/sms-notify-config/sms-notify-config.service';
import { SmsNotifyConfigController } from 'src/sms-notify-config/sms-notify-config.controller';
import { SmsModule } from 'src/sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SmsNotifyConfig, Order]),
    SmsModule,
  ],
  controllers: [SmsNotifyConfigController],
  providers: [SmsNotifyConfigService],
  exports: [SmsNotifyConfigService],
})
export class SmsNotifyConfigModule {}
