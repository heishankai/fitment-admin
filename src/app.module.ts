// 导入 NestJS 核心模块装饰器
import { Module } from '@nestjs/common';
// 如果使用数据库，可以导入 TypeOrmModule
import { TypeOrmModule } from '@nestjs/typeorm';
// 导入应用程序控制器
import { AppController } from './app.controller';
// 导入应用程序服务
import { AppService } from './app.service';
import { UserModule } from './admin/user/user.module';
import { AuthModule } from './admin/auth/auth.module';

/**
 * 应用程序的根模块
 * 这是 NestJS 应用程序的入口模块，负责组织和配置整个应用程序的结构
 */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: '127.0.0.1', // 生产替换为服务器ip
      port: 3306, // 生产数据库端口，一般还是 3306
      username: 'root',
      password: 'Lk1194657256',
      database: 'fitment_db_dev',
      // ----------------------------------------------------------
      synchronize: true, // 是否自动同步实体到数据库，开发环境下可以开启,生产环境必须关闭
      autoLoadEntities: true, // 自动加载定义的实体到数据库
    }),
    UserModule,
    AuthModule,
  ], // 导入其他模块的数组
  controllers: [AppController], // 注册控制器，处理 HTTP 请求
  providers: [AppService], // 注册服务提供者，包含业务逻辑
})
export class AppModule {}
