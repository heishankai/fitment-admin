import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WstService } from './wst.service';
import { WstGateway } from './wst.gateway';
import { WstController } from './wst.controller';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { WechatUserModule } from '../wechat-user/wechat-user.module';
import { AdminNotificationModule } from '../admin-notification/admin-notification.module';

/**
 * 聊天模块
 * 定义聊天相关的服务提供者和依赖关系
 * 包含WebSocket网关、服务和控制器
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoom, ChatMessage]),
    WechatUserModule,
    AdminNotificationModule,
  ],
  controllers: [WstController],
  providers: [WstGateway, WstService],
  exports: [WstService],
})
export class WstModule {}
