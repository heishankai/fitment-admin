import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { SystemNotificationService } from './system-notification.service';
import { SystemNotificationController } from './system-notification.controller';
import { SystemNotificationGateway } from './system-notification.gateway';
import { SystemNotification } from './system-notification.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';
import { JWT_CONFIG } from '../common/constants/app.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemNotification, CraftsmanUser]),
    JwtModule.register({
      secret: JWT_CONFIG.secret,
      signOptions: { expiresIn: JWT_CONFIG.expiresIn },
    }),
  ],
  controllers: [SystemNotificationController],
  providers: [SystemNotificationService, SystemNotificationGateway],
  exports: [SystemNotificationService],
})
export class SystemNotificationModule {}
