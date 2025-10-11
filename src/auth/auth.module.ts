import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
// 导入权限控制器
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
// 导入权限守卫(用于权限控制)
import { AuthGuard } from './auth.guard';
import { UserModule } from '../user/user.module';
import { JWT_CONFIG } from '../common/constants/app.constants';

@Module({
  imports: [
    UserModule,
    JwtModule.register({
      global: true, // 全局注册
      secret: JWT_CONFIG.secret, // 私钥
      signOptions: { expiresIn: JWT_CONFIG.expiresIn }, // 过期时间 (3天)
    }),
  ],
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
