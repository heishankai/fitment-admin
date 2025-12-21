import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Order } from './order.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';
import { IsSkillVerified } from '../is-skill-verified/is-skill-verified.entity';
import { WechatUser } from '../wechat-user/wechat-user.entity';
import { WorkPriceItem } from '../work-price-item/work-price-item.entity';
import { OrderService } from './order.service';
import { OrderGateway } from './order.gateway';
import { OrderController } from './order.controller';
import { JWT_CONFIG } from '../common/constants/app.constants';
import { WalletModule } from '../wallet/wallet.module';
import { WalletTransactionModule } from '../wallet-transaction/wallet-transaction.module';
import { WorkPriceItemModule } from '../work-price-item/work-price-item.module';
import { PlatformIncomeRecordModule } from '../platform-income-record/platform-income-record.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      CraftsmanUser,
      IsSkillVerified,
      WechatUser,
      WorkPriceItem,
    ]),
    WorkPriceItemModule,
    JwtModule.register({
      secret: JWT_CONFIG.secret,
      signOptions: { expiresIn: JWT_CONFIG.expiresIn },
    }),
    WalletModule,
    WalletTransactionModule,
    PlatformIncomeRecordModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderGateway],
  exports: [OrderService, OrderGateway],
})
export class OrderModule {}

