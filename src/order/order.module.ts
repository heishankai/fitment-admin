import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Order } from './order.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';
import { IsSkillVerified } from '../is-skill-verified/is-skill-verified.entity';
import { WechatUser } from '../wechat-user/wechat-user.entity';
import { OrderService } from './order.service';
import { OrderGateway } from './order.gateway';
import { OrderController } from './order.controller';
import { JWT_CONFIG } from '../common/constants/app.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      CraftsmanUser,
      IsSkillVerified,
      WechatUser,
    ]),
    JwtModule.register({
      secret: JWT_CONFIG.secret,
      signOptions: { expiresIn: JWT_CONFIG.expiresIn },
    }),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderGateway],
  exports: [OrderService, OrderGateway],
})
export class OrderModule {}

