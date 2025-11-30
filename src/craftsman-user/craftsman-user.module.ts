import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
// entity
import { CraftsmanUser } from './craftsman-user.entity';
import { IsSkillVerified } from '../is-skill-verified/is-skill-verified.entity';
import { Order } from '../order/order.entity';
// controller
import { CraftsmanUserController } from './craftsman-user.controller';
// service
import { CraftsmanUserService } from './craftsman-user.service';
// constants
import { JWT_CONFIG } from '../common/constants/app.constants';
// modules
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CraftsmanUser, IsSkillVerified, Order]),
    JwtModule.register({
      secret: JWT_CONFIG.secret,
      signOptions: { expiresIn: JWT_CONFIG.expiresIn },
    }),
    SmsModule, // 导入短信模块以使用验证码验证功能
  ],
  controllers: [CraftsmanUserController],
  providers: [CraftsmanUserService],
  exports: [CraftsmanUserService],
})
export class CraftsmanUserModule {}

