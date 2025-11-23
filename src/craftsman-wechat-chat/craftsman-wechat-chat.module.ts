import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { CraftsmanWechatChatController } from './craftsman-wechat-chat.controller';
import { CraftsmanWechatChatService } from './craftsman-wechat-chat.service';
import { CraftsmanWechatChatGateway } from './craftsman-wechat-chat.gateway';
import { CraftsmanWechatChatRoom } from './entities/craftsman-wechat-chat-room.entity';
import { CraftsmanWechatChatMessage } from './entities/craftsman-wechat-chat-message.entity';
import { JWT_CONFIG } from '../common/constants/app.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CraftsmanWechatChatRoom,
      CraftsmanWechatChatMessage,
    ]),
    JwtModule.register({
      secret: JWT_CONFIG.secret,
      signOptions: { expiresIn: JWT_CONFIG.expiresIn },
    }),
  ],
  controllers: [CraftsmanWechatChatController],
  providers: [CraftsmanWechatChatService, CraftsmanWechatChatGateway],
  exports: [CraftsmanWechatChatService],
})
export class CraftsmanWechatChatModule {}

