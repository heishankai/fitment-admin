import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomeService } from './home.service';
import { HomeController } from './home.controller';
import { WechatUser } from '../wechat-user/wechat-user.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';
import { Order } from '../order/order.entity';
import { Materials } from '../materials/materials.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WechatUser, CraftsmanUser, Order, Materials]),
  ],
  controllers: [HomeController],
  providers: [HomeService],
  exports: [HomeService],
})
export class HomeModule {}
