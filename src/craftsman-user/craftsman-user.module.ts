import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { SmsModule } from '../sms/sms.module';
// entity
import { CraftsmanUser } from './craftsman-user.entity';
import { IsSkillVerified } from '../is-skill-verified/is-skill-verified.entity';
import { Order } from '../order/order.entity';
import { WorkKind } from '../work-kind/work-kind.entity';
// controller
import { CraftsmanUserController } from './craftsman-user.controller';
// service
import { CraftsmanUserService } from './craftsman-user.service';
// constants
import { JWT_CONFIG } from '../common/constants/app.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([CraftsmanUser, IsSkillVerified, Order, WorkKind]),
    SmsModule,
    JwtModule.register({
      secret: JWT_CONFIG.secret,
      signOptions: { expiresIn: JWT_CONFIG.expiresIn },
    }),
  ],
  controllers: [CraftsmanUserController],
  providers: [CraftsmanUserService],
  exports: [CraftsmanUserService],
})
export class CraftsmanUserModule {}
