import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletTransaction } from './wallet-transaction.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';
import { WalletTransactionService } from './wallet-transaction.service';
import { WalletTransactionController } from './wallet-transaction.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletTransaction, CraftsmanUser]),
  ],
  controllers: [WalletTransactionController],
  providers: [WalletTransactionService],
  exports: [WalletTransactionService],
})
export class WalletTransactionModule {}
