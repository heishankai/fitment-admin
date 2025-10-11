import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
// entity
import { WechatUser } from './wechat-user.entity';
// controller
import { WechatUserController } from './wechat-user.controller';
// service
import { WechatUserService } from './wechat-user.service';
// constants
import { JWT_CONFIG } from '../common/constants/app.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([WechatUser]),
    JwtModule.register({
      secret: JWT_CONFIG.secret,
      signOptions: { expiresIn: JWT_CONFIG.expiresIn },
    }),
  ],
  controllers: [WechatUserController],
  providers: [WechatUserService],
  exports: [WechatUserService],
})
export class WechatUserModule {}
