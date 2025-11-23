import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CraftsmanChatService } from './craftsman-chat.service';
import { CraftsmanChatGateway } from './craftsman-chat.gateway';
import { CraftsmanChatController } from './craftsman-chat.controller';
import { CraftsmanChatRoom } from './entities/craftsman-chat-room.entity';
import { CraftsmanChatMessage } from './entities/craftsman-chat-message.entity';
import { CraftsmanUserModule } from '../craftsman-user/craftsman-user.module';

/**
 * 工匠聊天模块
 * 定义工匠聊天相关的服务提供者和依赖关系
 * 包含WebSocket网关、服务和控制器
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([CraftsmanChatRoom, CraftsmanChatMessage]),
    CraftsmanUserModule,
  ],
  controllers: [CraftsmanChatController],
  providers: [CraftsmanChatGateway, CraftsmanChatService],
  exports: [CraftsmanChatService],
})
export class CraftsmanChatModule {}

