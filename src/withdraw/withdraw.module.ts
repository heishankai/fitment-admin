import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Withdraw } from './withdraw.entity';
import { WithdrawService } from './withdraw.service';
import { WithdrawController } from './withdraw.controller';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';
import { CraftsmanBankCard } from '../craftsman-bank-card/craftsman-bank-card.entity';
import { WalletModule } from '../wallet/wallet.module';
import { WalletTransactionModule } from '../wallet-transaction/wallet-transaction.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Withdraw, CraftsmanUser, CraftsmanBankCard]),
    WalletModule,
    WalletTransactionModule,
  ],
  controllers: [WithdrawController],
  providers: [WithdrawService],
  exports: [WithdrawService],
})
export class WithdrawModule {}
