import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// entity
import { WechatUser } from './wechat-user.entity';
// controller
import { WechatUserController } from './wechat-user.controller';
// service
import { WechatUserService } from './wechat-user.service';

@Module({
  imports: [TypeOrmModule.forFeature([WechatUser])],
  controllers: [WechatUserController],
  providers: [WechatUserService],
  exports: [WechatUserService],
})
export class WechatUserModule {}
