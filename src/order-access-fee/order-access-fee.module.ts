import { Module } from '@nestjs/common';
import { OrderAccessFeeService } from './order-access-fee.service';
import { OrderAccessFeeController } from './order-access-fee.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderAccessFee } from './entities/order-access-fee.entity';
import { WechatUser } from '../wechat-user/wechat-user.entity';
import { WxPayModule } from '../common/wx-pay/wx-pay.module';
import { IndependentPageConfigModule } from '../independent-page-config/independent-page-config.module';
import { JwtModule } from '@nestjs/jwt';
import { JWT_CONFIG } from 'src/common/constants/app.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderAccessFee, WechatUser]),
    WxPayModule,
    IndependentPageConfigModule,
    JwtModule.register({
      secret: JWT_CONFIG.secret,
      signOptions: { expiresIn: JWT_CONFIG.expiresIn },
    }),
  ],
  controllers: [OrderAccessFeeController],
  providers: [OrderAccessFeeService],
})
export class OrderAccessFeeModule {}
