// 导入 NestJS 核心模块装饰器
import { Module } from '@nestjs/common';
// 如果使用数据库，可以导入 TypeOrmModule
import { TypeOrmModule } from '@nestjs/typeorm';
// 导入应用程序控制器
import { AppController } from './app.controller';
// 导入应用程序服务
import { AppService } from './app.service';
import { UserModule, AuthModule, CraftsmanModule } from './admin';
import { UploadModule } from './common/upload/upload.module';
import { DATABASE_CONFIG } from './common/constants/app.constants';

/**
 * 应用程序的根模块
 * 这是 NestJS 应用程序的入口模块，负责组织和配置整个应用程序的结构
 */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: DATABASE_CONFIG.type,
      host: DATABASE_CONFIG.host,
      port: DATABASE_CONFIG.port,
      username: DATABASE_CONFIG.username,
      password: DATABASE_CONFIG.password,
      database: DATABASE_CONFIG.database,
      synchronize: DATABASE_CONFIG.synchronize,
      autoLoadEntities: DATABASE_CONFIG.autoLoadEntities,
    }),
    UserModule,
    AuthModule,
    CraftsmanModule,
    UploadModule, // 公共文件上传模块
  ], // 导入其他模块的数组
  controllers: [AppController], // 注册控制器，处理 HTTP 请求
  providers: [AppService], // 注册服务提供者，包含业务逻辑
})
export class AppModule {}
