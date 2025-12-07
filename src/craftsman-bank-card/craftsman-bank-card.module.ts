import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CraftsmanBankCard } from './craftsman-bank-card.entity';
import { CraftsmanBankCardService } from './craftsman-bank-card.service';
import { CraftsmanBankCardController } from './craftsman-bank-card.controller';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CraftsmanBankCard, CraftsmanUser])],
  controllers: [CraftsmanBankCardController],
  providers: [CraftsmanBankCardService],
  exports: [CraftsmanBankCardService],
})
export class CraftsmanBankCardModule {}
