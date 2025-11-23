import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemNotificationService } from './system-notification.service';
import { SystemNotificationController } from './system-notification.controller';
import { SystemNotification } from './system-notification.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SystemNotification, CraftsmanUser])],
  controllers: [SystemNotificationController],
  providers: [SystemNotificationService],
  exports: [SystemNotificationService],
})
export class SystemNotificationModule {}

