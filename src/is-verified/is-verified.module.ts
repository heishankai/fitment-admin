import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IsVerifiedService } from './is-verified.service';
import { IsVerifiedController } from './is-verified.controller';
import { IsVerified } from './is-verified.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IsVerified, CraftsmanUser])],
  controllers: [IsVerifiedController],
  providers: [IsVerifiedService],
  exports: [IsVerifiedService],
})
export class IsVerifiedModule {}

