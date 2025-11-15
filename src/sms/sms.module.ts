import { Module } from '@nestjs/common';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';

@Module({
  controllers: [SmsController],
  providers: [SmsService],
  exports: [SmsService], // 导出服务，以便其他模块可以使用
})
export class SmsModule {}

