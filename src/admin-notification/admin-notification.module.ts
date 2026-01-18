import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AdminNotification } from './admin-notification.entity';
import { AdminNotificationService } from './admin-notification.service';
import { AdminNotificationController } from './admin-notification.controller';
import { AdminNotificationGateway } from './admin-notification.gateway';
import { JWT_CONFIG } from '../common/constants/app.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminNotification]),
    JwtModule.register({
      secret: JWT_CONFIG.secret,
      signOptions: { expiresIn: JWT_CONFIG.expiresIn },
    }),
  ],
  controllers: [AdminNotificationController],
  providers: [AdminNotificationService, AdminNotificationGateway],
  exports: [AdminNotificationService, AdminNotificationGateway],
})
export class AdminNotificationModule {}

