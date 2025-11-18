// 导入 NestJS 核心模块装饰器
import { Module } from '@nestjs/common';
// 如果使用数据库，可以导入 TypeOrmModule
import { TypeOrmModule } from '@nestjs/typeorm';
// 导入应用程序控制器
import { AppController } from './app.controller';
// 导入应用程序服务
import { AppService } from './app.service';
// 导入公共文件上传模块
import { UploadModule } from './common/upload/upload.module';
// 导入管理模块
import {
  UserModule,
  AuthModule,
  SmsModule,
  WechatUserModule,
  WechatAddressModule,
  CaseQueryModule,
  CityModule,
  CategoryConfigModule,
  CommodityConfigModule,
  WorkTypeModule,
  WorkKindModule,
  LabourCostModule,
  CraftsmanQueryModule,
  CraftsmanUserModule,
  SwiperConfigModule,
} from './index';
// 导入数据库配置
import { DATABASE_CONFIG } from './common/constants/app.constants';
import { WstModule } from './wst/wst.module';

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
    UserModule, // 用户模块
    AuthModule, // 权限模块
    SmsModule, // 短信模块
    UploadModule, // 公共文件上传模块
    WechatUserModule, // 微信用户模块
    WechatAddressModule, // 微信地址模块
    CaseQueryModule, // 案例查询模块
    CityModule, // 城市模块
    CategoryConfigModule, // 类目配置模块
    CommodityConfigModule, // 商品配置模块
    WorkTypeModule, // 工种类型模块
    WorkKindModule, // 工种配置模块
    LabourCostModule, // 人工成本配置模块
    CraftsmanQueryModule, // 工匠查询模块
    CraftsmanUserModule, // 工匠用户模块
    SwiperConfigModule,
    WstModule, // 轮播图配置模块
  ],
  // 导入其他模块的数组
  controllers: [AppController], // 注册控制器，处理 HTTP 请求
  providers: [AppService], // 注册服务提供者，包含业务逻辑
})
export class AppModule {}
