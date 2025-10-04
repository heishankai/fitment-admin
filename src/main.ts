import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

/**
 * 应用程序的入口文件，它使用核心函数 NestFactory 来创建 Nest 应用程序实例。
 */
async function bootstrap() {
  // 1. 创建应用实例
  const app = await NestFactory.create(AppModule);

  // 2. 全局注册响应拦截器
  app.useGlobalInterceptors(new ResponseInterceptor());

  // 3. 启用CORS支持
  app.enableCors({
    origin: true, // 允许所有来源，生产环境建议指定具体域名
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true, // 允许携带凭证
  });

  // 4. 监听端口，启动应用
  await app.listen(process.env.PORT ?? 3000);
  console.log('location: http://localhost:' + (process.env.PORT ?? 3000));
}
bootstrap();
