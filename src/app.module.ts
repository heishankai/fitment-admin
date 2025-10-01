// 导入 NestJS 核心模块装饰器
import { Module } from '@nestjs/common';
// 导入应用程序控制器
import { AppController } from './app.controller';
import { TextController } from './test.controller';
// 导入应用程序服务
import { AppService } from './app.service';
import { TestService } from './test.service';
import { UserModule } from './admin/user/user.module';
import { AuthModule } from './admin/auth/auth.module';

/**
 * 应用程序的根模块
 * 这是 NestJS 应用程序的入口模块，负责组织和配置整个应用程序的结构
 */
@Module({
  imports: [UserModule, AuthModule], // 导入其他模块的数组
  controllers: [AppController, TextController], // 注册控制器，处理 HTTP 请求
  providers: [AppService, TestService], // 注册服务提供者，包含业务逻辑
})
export class AppModule {}
