import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
// 导入权限控制器
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
// 导入权限守卫(用于权限控制)
import { AuthGuard } from './auth.guard';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AuthModule {}
