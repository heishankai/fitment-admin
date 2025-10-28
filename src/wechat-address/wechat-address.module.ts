import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WechatAddressService } from './wechat-address.service';
import { WechatAddressController } from './wechat-address.controller';
import { WechatAddress } from './wechat-address.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WechatAddress])],
  controllers: [WechatAddressController],
  providers: [WechatAddressService],
  exports: [WechatAddressService],
})
export class WechatAddressModule {}
