import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CraftWechatUser } from './craft-wechat-user.entity';
import { CraftWechatUserController } from './craft-wechat-user.controller';
import { CraftWechatUserService } from './craft-wechat-user.service';

@Module({
  imports: [TypeOrmModule.forFeature([CraftWechatUser])],
  controllers: [CraftWechatUserController],
  providers: [CraftWechatUserService],
  exports: [CraftWechatUserService],
})
export class CraftWechatUserModule {}
